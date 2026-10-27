-- Taxi Booking Web App — Melbourne
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.

-- ─────────────────────────────────────────────────────────────
-- bookings
-- ─────────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  service_type            text not null
                            check (service_type in ('wheelchair', 'suv', 'maxi', 'parcel')),
  status                  text not null default 'new'
                            check (status in ('new', 'confirmed', 'in_progress', 'done', 'cancelled')),

  customer_name           text not null,
  customer_phone          text not null,

  pickup_address          text not null,
  pickup_lat              float8,
  pickup_lng              float8,
  dropoff_address         text not null,
  dropoff_lat             float8,
  dropoff_lng             float8,
  stops                   jsonb not null default '[]'::jsonb
                            check (jsonb_typeof(stops) = 'array'),

  booking_datetime        timestamptz not null,
  is_recurring            boolean not null default false,
  recurring_schedule      text,

  passenger_count         int2 check (passenger_count >= 0),
  luggage_count           int2 check (luggage_count >= 0),
  baby_seat               boolean not null default false,
  mptp_card               boolean not null default false,
  ndis_number             text,
  notes                   text,
  is_interstate           boolean not null default false,

  tariff                  int2 not null default 1 check (tariff in (1, 2)),
  distance_km             float8 check (distance_km >= 0),
  quote_breakdown         jsonb,
  estimated_fare          numeric(10,2),
  pre_booking_fee_paid    boolean not null default false,

  wait_started_at         timestamptz,
  wait_minutes_charged    int2 not null default 0 check (wait_minutes_charged >= 0),

  driver_notes            text,

  review_request_sent     boolean not null default false,
  review_request_sent_at  timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- Column comments
-- ─────────────────────────────────────────────────────────────
comment on table  public.bookings is 'Every customer booking and quote request. One admin (owner/driver) dispatches from /driver.';

comment on column public.bookings.id                     is 'Unique booking ID.';
comment on column public.bookings.created_at             is 'When the customer submitted the booking.';
comment on column public.bookings.updated_at             is 'Last time the row changed. Set automatically by trigger.';
comment on column public.bookings.service_type           is 'wheelchair | suv | maxi | parcel.';
comment on column public.bookings.status                 is 'Dispatch stage: new | confirmed | in_progress | done | cancelled. Drives the driver Kanban board.';
comment on column public.bookings.customer_name          is 'Customer full name.';
comment on column public.bookings.customer_phone         is 'Customer mobile, E.164 format (+614...). Used for Twilio SMS/WhatsApp.';
comment on column public.bookings.pickup_address         is 'Pickup address as chosen in Google Places Autocomplete.';
comment on column public.bookings.pickup_lat             is 'Pickup latitude.';
comment on column public.bookings.pickup_lng             is 'Pickup longitude.';
comment on column public.bookings.dropoff_address        is 'Drop-off address as chosen in Google Places Autocomplete.';
comment on column public.bookings.dropoff_lat            is 'Drop-off latitude.';
comment on column public.bookings.dropoff_lng            is 'Drop-off longitude.';
comment on column public.bookings.stops                  is 'Extra stops in travel order: [{address, lat, lng, type: enroute|deviation}]. Empty array if none.';
comment on column public.bookings.booking_datetime       is 'Requested pickup time. Must be at least 45 min after created_at.';
comment on column public.bookings.is_recurring           is 'True if this is a repeating booking (e.g. weekly dialysis run).';
comment on column public.bookings.recurring_schedule     is 'Repeat pattern when is_recurring, e.g. "every_monday_7am".';
comment on column public.bookings.passenger_count        is 'Number of passengers.';
comment on column public.bookings.luggage_count          is 'Number of bags/suitcases.';
comment on column public.bookings.baby_seat              is 'Baby seat requested (+$10.00). Not available for parcel.';
comment on column public.bookings.mptp_card              is 'Customer says they hold an MPTP/M31 card (wheelchair only). Driver verifies physically at pickup.';
comment on column public.bookings.ndis_number            is 'NDIS participant number, if the trip is NDIS-funded.';
comment on column public.bookings.notes                  is 'Customer notes for the driver (access instructions, mobility needs, parcel details).';
comment on column public.bookings.is_interstate          is 'Interstate/long-haul request. Quote-only — no auto-price; estimated_fare stays null until the owner quotes.';
comment on column public.bookings.tariff                 is '1 = standard hours ($2.30/km), 2 = nights/weekends ($2.50/km).';
comment on column public.bookings.distance_km            is 'Route distance from Google Distance Matrix at booking time.';
comment on column public.bookings.quote_breakdown        is 'Full QuoteResult (line items, subtotal, MPTP discount, lifting fee, total) shown to the customer at booking time.';
comment on column public.bookings.estimated_fare         is 'QuoteResult.total in AUD. An estimate for wheelchair (metered), firm quote for other services.';
comment on column public.bookings.pre_booking_fee_paid   is 'Whether the $7.00 non-refundable pre-booking fee has been paid.';
comment on column public.bookings.wait_started_at        is 'When the driver started the wait timer at pickup. First 7 min are free.';
comment on column public.bookings.wait_minutes_charged   is 'Billable wait minutes after the 7 min free buffer ($1.00/min).';
comment on column public.bookings.driver_notes           is 'Private notes from the driver/admin. Never shown to the customer.';
comment on column public.bookings.review_request_sent    is 'Whether a post-trip review request has been sent.';
comment on column public.bookings.review_request_sent_at is 'When the review request was sent.';

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────
create index if not exists bookings_status_idx           on public.bookings (status);
create index if not exists bookings_booking_datetime_idx on public.bookings (booking_datetime);
create index if not exists bookings_service_type_idx     on public.bookings (service_type);

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
-- Customers never touch this table directly: /api/bookings validates the
-- booking, recalculates the quote and inserts with the service role key
-- (which bypasses RLS). So the anon role gets no policies at all — nobody
-- can read other people's bookings or insert a fake price from the browser.
--
-- The driver/admin logs in via Supabase Auth and gets full access.
-- Only create the one admin user (Dashboard → Authentication → Users), and
-- turn off public sign-ups (Authentication → Providers → Email).
alter table public.bookings enable row level security;

drop policy if exists "Admin can read bookings" on public.bookings;
create policy "Admin can read bookings"
  on public.bookings for select
  to authenticated
  using (true);

drop policy if exists "Admin can update bookings" on public.bookings;
create policy "Admin can update bookings"
  on public.bookings for update
  to authenticated
  using (true)
  with check (true);
