create table if not exists available_dates (
  booking_date date primary key,
  created_at timestamptz default now()
);
