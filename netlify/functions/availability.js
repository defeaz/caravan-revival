import { createClient } from '@supabase/supabase-js';
import {
  canFitBooking,
  isServed,
  locationsAreNearby,
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
    'access-control-allow-methods': 'GET, OPTIONS',
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

  const url = new URL(req.url);
  const locationInput =
    url.searchParams.get('location') ||
    url.searchParams.get('postcode') ||
    '';
  const service = url.searchParams.get('service') || 'oneoff';

  if (!serviceLoad(service)) {
    return json(
      { error: 'Please choose a valid cleaning service.' },
      400,
      origin
    );
  }

  let target;
  try {
    target = await resolveLocation(locationInput);
  } catch (error) {
    return json({ error: error.message }, 400, origin);
  }

  if (!isServed(target.postcode)) {
    return json(
      {
        error:
          'This location is outside the normal service area. Please send an enquiry if you would like us to consider travelling further.'
      },
      400,
      origin
    );
  }

  const db = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 60);
  const firstDay = start.toISOString().slice(0, 10);
  const lastDay = end.toISOString().slice(0, 10);

  const { data: available, error: availabilityError } = await db
    .from('available_dates')
    .select('booking_date')
    .gte('booking_date', firstDay)
    .lte('booking_date', lastDay);

  if (availabilityError) {
    return json(
      { error: 'Availability is temporarily unavailable.' },
      500,
      origin
    );
  }

  const { data: bookings, error: bookingError } = await db
    .from('bookings')
    .select('booking_date,postcode,postcode_area,service,status')
    .gte('booking_date', firstDay)
    .lte('booking_date', lastDay)
    .neq('status', 'cancelled');

  if (bookingError) {
    return json(
      { error: 'Availability is temporarily unavailable.' },
      500,
      origin
    );
  }

  const availableSet = new Set(
    (available || []).map((item) => item.booking_date)
  );
  const dates = [];

  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const value = day.toISOString().slice(0, 10);
    if (!availableSet.has(value)) continue;

    const existing = (bookings || []).filter(
      (booking) => booking.booking_date === value
    );

    if (
      canFitBooking(existing, service) &&
      (await locationsAreNearby(existing, target))
    ) {
      dates.push({
        value,
        label: new Intl.DateTimeFormat('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        }).format(new Date(`${value}T12:00:00`))
      });
    }

    if (dates.length === 12) break;
  }

  return json({ dates }, 200, origin);
};
