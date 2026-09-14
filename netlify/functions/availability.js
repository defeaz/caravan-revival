import { createClient } from '@supabase/supabase-js';
import {
  canFitBooking,
  isServed,
  postcodeArea,
  serviceLoad
} from '../../lib/config.js';

export default async req => {
  const url = new URL(req.url);
  const postcode = url.searchParams.get('postcode')?.trim() || '';
  const service = url.searchParams.get('service') || 'oneoff';
  if (!isServed(postcode) || !serviceLoad(service)) {
    return Response.json({ error: 'This postcode is outside the Caravan Revival service area. Please send an enquiry if you would like us to consider travelling further.' }, { status: 400 });
  }
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const start = new Date(); start.setDate(start.getDate() + 1);
  const end = new Date(start); end.setDate(end.getDate() + 60);
  const { data: available, error: availabilityError } = await db.from('available_dates').select('booking_date')
    .gte('booking_date', start.toISOString().slice(0, 10)).lte('booking_date', end.toISOString().slice(0, 10));
  if (availabilityError) return Response.json({ error: 'Availability is temporarily unavailable.' }, { status: 500 });
  const { data: bookings } = await db.from('bookings').select('booking_date,postcode_area,service,status')
    .gte('booking_date', start.toISOString().slice(0, 10)).neq('status', 'cancelled');
  const availableSet = new Set((available || []).map(x => x.booking_date));
  const wanted = postcodeArea(postcode), dates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    if (!availableSet.has(day)) continue;
    const b = (bookings || []).filter(x => x.booking_date === day);
    if (canFitBooking(b, service, wanted)) {
      dates.push({ value: day, label: new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(day + 'T12:00:00')) });
    }
    if (dates.length === 12) break;
  }
  return Response.json({ dates });
};
