import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import {
  canFitBooking,
  locationsAreNearby,
  priceFor,
  postcodeArea,
  isServed,
  resolveLocation,
  serviceLoad
} from '../../lib/config.js';

const allowedOrigins = new Set([
  'https://caravanrevival.com',
  'https://www.caravanrevival.com',
  'https://harbourshine.com',
  'https://www.harbourshine.com'
]);

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': allowedOrigins.has(origin)
      ? origin
      : 'https://caravanrevival.com',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'Origin'
  };
}

function json(body, status, origin) {
  return Response.json(body, {
    status,
    headers: corsHeaders(origin)
  });
}

export default async (req) => {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (origin && !allowedOrigins.has(origin)) {
    return json({ error: 'Origin not allowed.' }, 403, origin);
  }

  if (req.method !== 'POST') {
    return new Response('', { status: 405, headers: corsHeaders(origin) });
  }

  const booking = await req.json();
  const isBoat = booking.service === 'boat-oneoff' || booking.service === 'boat-regular';
  const locationInput = isBoat ? booking.locationQuery : booking.postcode;
  const cleanPrice = isBoat ? 0 : priceFor(booking.service, booking.size);
  const commonRequired = [
    'date',
    'service',
    'vehicleType',
    'model',
    'name',
    'email',
    'phone'
  ];
  const boatRequired = ['locationQuery', 'length'];
  const required = isBoat
    ? [...commonRequired, ...boatRequired]
    : [...commonRequired, 'postcode'];

  if (
    required.some((field) => !String(booking[field] || '').trim()) ||
    !serviceLoad(booking.service) ||
    (!isBoat && !cleanPrice)
  ) {
    return json({ error: 'Please check the booking details.' }, 400, origin);
  }

  let resolvedLocation;
  try {
    resolvedLocation = await resolveLocation(locationInput);
  } catch (error) {
    return json({ error: error.message }, 400, origin);
  }

  if (!isServed(resolvedLocation.postcode)) {
    return json(
      { error: 'This location is outside the normal service area.' },
      400,
      origin
    );
  }

  const area = postcodeArea(resolvedLocation.postcode);
  const db = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: existing, error: readError } = await db
    .from('bookings')
    .select('postcode,postcode_area,service,status')
    .eq('booking_date', booking.date)
    .neq('status', 'cancelled');

  if (readError) {
    return json(
      { error: 'The calendar could not be checked. Please try again.' },
      500,
      origin
    );
  }

  if (
    !canFitBooking(existing || [], booking.service) ||
    !(await locationsAreNearby(existing || [], resolvedLocation))
  ) {
    return json(
      {
        error:
          'That date has just filled or is now reserved for work in another area. Please choose another.'
      },
      409,
      origin
    );
  }

  const id = crypto.randomUUID();
  const frequency =
    booking.service === 'boat-regular' && booking.frequency
      ? ` · ${booking.frequency}`
      : '';
  const model = isBoat
    ? `${booking.model} · ${booking.length} ft · ${locationInput}${frequency}`
    : booking.model;
  const size = isBoat ? `${booking.length} ft` : booking.size;
  const { error: insertError } = await db.from('bookings').insert({
    id,
    booking_date: booking.date,
    postcode: resolvedLocation.postcode,
    postcode_area: area,
    service: booking.service,
    size,
    vehicle_type: booking.vehicleType,
    model,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    clean_price: cleanPrice,
    status: 'awaiting_payment'
  });

  if (insertError) {
    return json(
      { error: 'The booking could not be reserved. Please try again.' },
      500,
      origin
    );
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const returnBase = isBoat
      ? 'https://harbourshine.com'
      : process.env.URL || 'https://caravanrevival.com';
    const arrangement = isBoat
      ? booking.service === 'boat-regular'
        ? 'Regular cleaning'
        : 'One-off clean'
      : `One-off clean £${cleanPrice}${
          booking.service === 'ongoing' ? ' · ongoing cleaning requested' : ''
        }`;
    const business = isBoat ? 'Harbour Shine' : 'Caravan Revival';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: booking.email,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            unit_amount: 3000,
            product_data: {
              name: `${business} booking deposit`,
              description: `${booking.date} · ${booking.model} · ${arrangement}`
            }
          },
          quantity: 1
        }
      ],
      metadata: { booking_id: id, business },
      success_url: `${returnBase}/confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnBase}/#book`,
      payment_intent_data: {
        description: `${business} deposit for ${booking.name} — ${booking.date}`
      }
    });

    return json({ url: session.url }, 200, origin);
  } catch {
    await db.from('bookings').delete().eq('id', id);
    return json(
      { error: 'Secure payment could not be started. Please try again.' },
      500,
      origin
    );
  }
};
