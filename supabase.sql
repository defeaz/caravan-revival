create table bookings (id uuid primary key, created_at timestamptz default now(), booking_date date not null, postcode text not null, postcode_area text not null, service text not null, size text not null, vehicle_type text not null, model text not null, name text not null, email text not null, phone text not null, clean_price integer not null, status text not null, stripe_session_id text);
create index bookings_date_idx on bookings(booking_date);
create table blocked_dates (booking_date date primary key, note text);

create table available_dates (booking_date date primary key, created_at timestamptz default now());
alter table bookings enable row level security;
alter table blocked_dates enable row level security;
