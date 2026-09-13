import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { priceFor, postcodeArea, isServed } from '../../lib/config.js';

export default async req => {
  if (req.method !== 'POST') return new Response('', { status: 405 });
  const b = await req.json();
  const cleanPrice = priceFor(b.service, b.size);
  if (!cleanPrice || !isServed(b.postcode || '')) {
    return Response.json({ error: 'Please check the booking details.' }, { status: 400 });
  }

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: existing, error: readError } = await db.from('bookings')
    .select('postcode_area,service,status').eq('booking_date', b.date).neq('status', 'cancelled');
  if (readError) return Response.json({ error: `Database check failed: ${readError.message}` }, { status: 500 });
  if ((existing || []).some(x => x.postcode_area !== postcodeArea(b.postcode))) {
    return Response.json({ error: 'That date has just been reserved in another area. Please choose another.' }, { status: 409 });
  }
  if ((existing || []).length >= 2) {
    return Response.json({ error: 'That date has just filled. Please choose another.' }, { status: 409 });
  }

  const ref = crypto.randomUUID();
  const { error } = await db.from('bookings').insert({
    id: ref, booking_date: b.date, postcode: b.postcode.toUpperCase(),
    postcode_area: postcodeArea(b.postcode), service: b.service, size: b.size,
    vehicle_type: b.vehicleType, model: b.model, name: b.name, email: b.email,
    phone: b.phone, clean_price: cleanPrice, status: 'awaiting_payment'
  });
  if (error) return Response.json({ error: `Database reservation failed: ${error.message}` }, { status: 500 });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const base = process.env.URL || 'https://caravanrevival.com';
    const repeat = { monthly: ' then every month', two_monthly: ' then every 2 months', three_monthly: ' then every 3 months' }[b.service] || '';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', customer_email: b.email,
      line_items: [{ price_data: { currency: 'gbp', unit_amount: 3000, product_data: {
        name: 'Caravan Revival booking deposit',
        description: `${b.date} · ${b.model} · one-off clean £${cleanPrice}${repeat}`
      } }, quantity: 1 }],
      metadata: { booking_id: ref }, success_url: `${base}/confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/#book`, payment_intent_data: { description: `Deposit for ${b.name} — ${b.date}` }
    });
    return Response.json({ url: session.url });
  } catch (error) {
    await db.from('bookings').delete().eq('id', ref);
    return Response.json({ error: `Payment setup failed: ${error.message}` }, { status: 500 });
  }
};
