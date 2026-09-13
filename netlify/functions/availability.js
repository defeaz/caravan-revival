import { createClient } from '@supabase/supabase-js';
import { isServed, postcodeArea } from '../../lib/config.js';

export default async req => {
  const postcode = new URL(req.url).searchParams.get('postcode')?.trim() || '';
  if (!isServed(postcode)) {
    return Response.json({ error: 'This postcode is outside the Caravan Revival service area. Please send an enquiry if you would like us to consider travelling further.' }, { status: 400 });
  }
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const start = new Date(); start.setDate(start.getDate() + 1);
  const end = new Date(start); end.setDate(end.getDate() + 60);
  const { data: blocked } = await db.from('blocked_dates').select('booking_date')
    .gte('booking_date', start.toISOString().slice(0, 10)).lte('booking_date', end.toISOString().slice(0, 10));
  const { data: bookings } = await db.from('bookings').select('booking_date,postcode_area,service,status')
    .gte('booking_date', start.toISOString().slice(0, 10)).neq('status', 'cancelled');
  const blockedSet = new Set((blocked || []).map(x => x.booking_date));
  const wanted = postcodeArea(postcode), dates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) continue;
    const day = d.toISOString().slice(0, 10);
    if (blockedSet.has(day)) continue;
    const b = (bookings || []).filter(x => x.booking_date === day);
    if (!b.some(x => x.postcode_area !== wanted) && b.length < 2) {
      dates.push({ value: day, label: new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(day + 'T12:00:00')) });
    }
    if (dates.length === 12) break;
  }
  return Response.json({ dates });
};
