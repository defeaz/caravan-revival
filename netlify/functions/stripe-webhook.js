import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async (req) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      await req.text(),
      req.headers.get('stripe-signature'),
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const db = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: booking } = await db
      .from('bookings')
      .update({ status: 'confirmed', stripe_session_id: session.id })
      .eq('id', session.metadata.booking_id)
      .select()
      .single();

    if (booking && process.env.RESEND_API_KEY) {
      const isBoat = booking.service.startsWith('boat-');
      const business = isBoat ? 'Harbour Shine' : 'Caravan Revival';
      const priceLine = isBoat
        ? '£30 booking deposit paid; final cleaning price to be confirmed.'
        : `Full clean: £${booking.clean_price}; £30 deposit paid.`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.BOOKING_FROM_EMAIL,
          to: ['gus.ferranti@gmail.com', booking.email],
          subject: `${business} booking confirmed — ${booking.booking_date}`,
          html: `<h2>${business} booking confirmed</h2><p><strong>${booking.name}</strong> — ${booking.phone}</p><p>${booking.vehicle_type}: ${booking.model} (${booking.size})</p><p>${booking.booking_date}, ${booking.postcode}</p><p>${priceLine}</p>`
        })
      });
    }
  }

  return Response.json({ received: true });
};
