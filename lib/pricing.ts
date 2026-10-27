import type { MultiStopType, QuoteLineItem, QuoteResult, ServiceType, Tariff } from '@/types/booking';

// All prices from CLAUDE.md — do not change without the owner's sign-off.
// Stored in cents so sums don't pick up floating-point errors.
const FLAGFALL = 585;
const TARIFF_RATE_PER_KM: Record<Tariff, number> = { 1: 230, 2: 250 };
const TARIFF_NAME: Record<Tariff, string> = { 1: 'Standard', 2: 'Night/Weekend' };
const LEVY = 128;
const BOOKING_FEE = 270;
const MAXI_BASE = 1783;
const BABY_SEAT = 1000;
const MULTI_STOP_ENROUTE = 1000;
const MULTI_STOP_DEVIATION = 1500;
const LIFTING_FEE = 3170;
const MPTP_SUBSIDY_RATE = 0.5;

// Wording exactly as in CLAUDE.md
export const WHEELCHAIR_DISCLAIMER =
  'This is an estimate. Final fare is metered. MPTP subsidy applied upon card verification.';

const toDollars = (cents: number) => cents / 100;
const perKm = (tariff: Tariff) => `$${toDollars(TARIFF_RATE_PER_KM[tariff]).toFixed(2)}/km`;

// Always Melbourne time, whatever timezone the browser or server (Vercel = UTC) is in
const melbourneClock = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Melbourne',
  weekday: 'short',
  hour: 'numeric',
  hourCycle: 'h23',
});

/**
 * Tariff 2 (Night/Weekend): all day Saturday and Sunday, or 11:00pm–4:59am any day.
 * Tariff 1 (Standard): all other times.
 */
export function getTariff(at: Date = new Date()): Tariff {
  const parts = melbourneClock.formatToParts(at);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const isNight = hour >= 23 || hour < 5;
  return isWeekend || isNight ? 2 : 1;
}

export function calculateQuote(params: {
  serviceType: ServiceType;
  distanceKm: number;
  babySeat: boolean;
  multiStop: MultiStopType;
  deviationKm: number;
  mptp: boolean;
  /** Pickup time — sets the tariff. Defaults to now (e.g. instant estimate before a time is chosen). */
  pickupTime?: Date;
}): QuoteResult {
  const { serviceType, distanceKm, babySeat, multiStop, deviationKm, mptp, pickupTime } = params;
  const tariff = getTariff(pickupTime);
  const rate = TARIFF_RATE_PER_KM[tariff];
  const isWheelchair = serviceType === 'wheelchair';
  const chargesPerKm = serviceType !== 'maxi' || multiStop === 'deviation';

  // Fare items in cents; converted to dollars on the way out.
  // `metered` marks the parts of the fare the MPTP subsidy applies to.
  // `info` lines explain the fare but carry no charge.
  const items: { label: string; cents: number; note?: string; metered?: boolean; info?: boolean }[] = [];

  // Tariff is applied automatically, shown so the customer can see why
  if (chargesPerKm) {
    items.push({ label: `Rate: Tariff ${tariff} — ${TARIFF_NAME[tariff]} ${perKm(tariff)}`, cents: 0, info: true });
  }

  if (serviceType === 'maxi') {
    items.push({ label: 'Maxi base charge', cents: MAXI_BASE, metered: true });
  } else {
    items.push({ label: 'Flagfall', cents: FLAGFALL, metered: true });
    items.push({ label: `Distance (${distanceKm} km)`, cents: Math.round(distanceKm * rate), metered: true });
  }
  items.push({ label: 'Levy', cents: LEVY, metered: true });
  items.push({ label: 'Booking fee', cents: BOOKING_FEE, metered: true });

  if (babySeat && serviceType !== 'parcel') {
    items.push({ label: 'Baby seat', cents: BABY_SEAT });
  }
  if (multiStop === 'enroute') {
    items.push({ label: 'Extra stop (en route)', cents: MULTI_STOP_ENROUTE });
  } else if (multiStop === 'deviation') {
    items.push({ label: 'Extra stop (deviation)', cents: MULTI_STOP_DEVIATION });
    items.push({ label: `Deviation distance (${deviationKm} km)`, cents: Math.round(deviationKm * rate), metered: true });
  }

  const subtotal = items.reduce((sum, i) => sum + i.cents, 0);

  let mptpDiscount = 0;
  let liftingFee = 0;
  if (isWheelchair && mptp) {
    // 50% off the metered fare only — not the flat add-on fees, never the lifting fee
    const meteredFare = items.filter((i) => i.metered).reduce((sum, i) => sum + i.cents, 0);
    mptpDiscount = Math.round(meteredFare * MPTP_SUBSIDY_RATE);
    liftingFee = LIFTING_FEE;
    items.push({ label: 'MPTP subsidy (50% of metered fare)', cents: -mptpDiscount, note: 'Applied on M31 card verification' });
    items.push({ label: 'Lifting fee (M31 card)', cents: LIFTING_FEE, note: 'Paid from M31 card' });
  }

  const lineItems: QuoteLineItem[] = items.map(({ label, cents, note, info }) => ({
    label,
    amount: toDollars(cents),
    ...(note && { note }),
    ...(info && { info }),
  }));

  return {
    lineItems,
    tariff,
    subtotal: toDollars(subtotal),
    mptpDiscount: toDollars(mptpDiscount),
    liftingFee: toDollars(liftingFee),
    total: toDollars(subtotal - mptpDiscount + liftingFee),
    isEstimate: isWheelchair,
    ...(isWheelchair && { estimateDisclaimer: WHEELCHAIR_DISCLAIMER }),
  };
}

/*
 * Expected outputs (pickup times are Melbourne local time)
 *
 * getTariff(new Date('2026-10-28T14:00:00+11:00'))  // Wed 2:00pm  → 1
 * getTariff(new Date('2026-10-28T23:00:00+11:00'))  // Wed 11:00pm → 2
 * getTariff(new Date('2026-10-29T04:59:00+11:00'))  // Thu 4:59am  → 2
 * getTariff(new Date('2026-10-29T05:00:00+11:00'))  // Thu 5:00am  → 1
 * getTariff(new Date('2026-10-31T12:00:00+11:00'))  // Sat noon    → 2
 *
 * 1. Wheelchair 8km, weekday daytime (Tariff 1), no MPTP
 *    calculateQuote({ serviceType: 'wheelchair', distanceKm: 8, babySeat: false, multiStop: 'none',
 *      deviationKm: 0, mptp: false, pickupTime: new Date('2026-10-28T14:00:00+11:00') })
 *    Rate: Tariff 1 — Standard $2.30/km  (info)
 *    Flagfall                           5.85
 *    Distance (8 km)                   18.40
 *    Levy                               1.28
 *    Booking fee                        2.70
 *    → subtotal 28.23, mptpDiscount 0, liftingFee 0, total 28.23, tariff 1, isEstimate true
 *
 * 2. Wheelchair 8km, weekday daytime (Tariff 1), with MPTP
 *    Same as 1 with mptp: true
 *    Rate: Tariff 1 — Standard $2.30/km  (info)
 *    Flagfall                           5.85
 *    Distance (8 km)                   18.40
 *    Levy                               1.28
 *    Booking fee                        2.70
 *    MPTP subsidy (50% of metered)    -14.12   (28.23 × 50% = 14.115, rounded)
 *    Lifting fee (M31 card)            31.70
 *    → subtotal 28.23, mptpDiscount 14.12, liftingFee 31.70, total 45.81, isEstimate true
 *
 * 3. SUV 12km, weekday daytime (Tariff 1), baby seat, en-route stop
 *    calculateQuote({ serviceType: 'suv', distanceKm: 12, babySeat: true, multiStop: 'enroute',
 *      deviationKm: 0, mptp: false, pickupTime: new Date('2026-10-28T14:00:00+11:00') })
 *    Rate: Tariff 1 — Standard $2.30/km  (info)
 *    Flagfall                           5.85
 *    Distance (12 km)                  27.60
 *    Levy                               1.28
 *    Booking fee                        2.70
 *    Baby seat                         10.00
 *    Extra stop (en route)             10.00
 *    → subtotal 57.43, total 57.43, isEstimate false
 *
 * 4. Maxi 20km, Saturday (Tariff 2), no extras
 *    calculateQuote({ serviceType: 'maxi', distanceKm: 20, babySeat: false, multiStop: 'none',
 *      deviationKm: 0, mptp: false, pickupTime: new Date('2026-10-31T12:00:00+11:00') })
 *    Maxi base charge                  17.83   (replaces flagfall + km — no rate line, tariff doesn't apply)
 *    Levy                               1.28
 *    Booking fee                        2.70
 *    → subtotal 21.81, total 21.81, tariff 2, isEstimate false
 */
