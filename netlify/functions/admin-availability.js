import { createClient } from '@supabase/supabase-js';

const authorised = req => {
  const supplied = req.headers.get('x-admin-key') || '';
  const expected = process.env.ADMIN_SECRET || '';
  return expected.length >= 10 && supplied === expected;
};

export default async req => {
  if (!authorised(req)) return Response.json({ error: 'Incorrect admin password.' }, { status: 401 });
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (req.method === 'GET') {
    const start = new Date().toISOString().slice(0, 10);
    const endDate = new Date(); endDate.setDate(endDate.getDate() + 120);
    const end = endDate.toISOString().slice(0, 10);
    const [{ data: available, error }, { data: bookings }] = await Promise.all([
      db.from('available_dates').select('booking_date').gte('booking_date', start).lte('booking_date', end),
      db.from('bookings').select('booking_date,postcode_area,status').gte('booking_date', start).lte('booking_date', end).neq('status', 'cancelled')
    ]);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const counts = {};
    for (const booking of bookings || []) counts[booking.booking_date] = (counts[booking.booking_date] || 0) + 1;
    return Response.json({ dates: (available || []).map(x => x.booking_date), bookings: counts });
  }
  if (req.method === 'POST') {
    const { date, available } = await req.json();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return Response.json({ error: 'Invalid date.' }, { status: 400 });
    const query = available ? db.from('available_dates').upsert({ booking_date: date }) : db.from('available_dates').delete().eq('booking_date', date);
    const { error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }
  return new Response('', { status: 405 });
};
