# Taxi Booking Web App — Melbourne

## What this is
PWA (Progressive Web App) for a Melbourne taxi operator. Services: Wheelchair, SUV, Maxi Taxi, Parcel Delivery. One admin (the owner/driver) sees all bookings and decides dispatch.

## Pricing (exact — do not change)

### Meter fare (Wheelchair service)
- Flagfall: $5.85
- Tariff 1 (standard hours): $2.30/km
- Tariff 2 (nights/weekends): $2.50/km
- Levy: $1.28
- Booking fee (pre-booked): $2.70
- Wait charge: $1.00/min after 7 min free buffer

### MPTP / M31 card (Wheelchair only)
- Lifting fee: $31.70 — paid BY the customer from their M31 card. This is SEPARATE from and in addition to the metered fare.
- MPTP subsidy: 50% off the metered fare portion only (not off the lifting fee)
- Customer total = $31.70 lifting fee + 50% of metered fare
- Driver verifies M31 card physically at pickup — system shows estimate only

### Fixed price services (SUV, Maxi, Parcel)
- Flagfall: $5.85
- Tariff 1: $2.30/km
- Tariff 2: $2.50/km
- Levy: $1.28
- Booking fee: $2.70
- Maxi base charge: $17.83 (replaces flagfall + km formula)
- Baby seat: $10.00
- Multi-stop en route: $10.00 flat
- Multi-stop deviation: $15.00 + per km off-route
- Cancellation fee: $25.00 (after window closes)
- Pre-booking fee: $7.00 (non-refundable, paid at booking)

## Fare estimator
ALL services get a real fare estimator — not a placeholder.
- SUV / Parcel: firm quote (Google Maps distance → formula)
- Maxi: firm quote using $17.83 base + add-ons
- Wheelchair: estimated fare with disclaimer: "This is an estimate. Final fare is metered. MPTP subsidy applied upon card verification."
No service shows "Coming Soon". All show a number.

## Booking rules
- Minimum 45 min before pickup
- Interstate/long haul: "Request a Quote" form only, no auto-price

## Tech stack
- Next.js 14 App Router + TypeScript + Tailwind CSS
- Supabase (database, auth, storage)
- Twilio (SMS + WhatsApp)
- Google Maps API (Places Autocomplete + Distance Matrix)
- Resend (email)
- Vercel (hosting)

## URLs
- / → customer booking site (PWA)
- /driver → driver/admin portal (PWA, login-gated)

## PWA requirements
- Both sides are PWA — installable to home screen
- App shell cached for offline (form UI loads without data connection)
- Booking form data persists if connection drops mid-fill
- Works on slow 3G / low data mobile connections
- No heavy libraries, lazy load all images, compressed assets
