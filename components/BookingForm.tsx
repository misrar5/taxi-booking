'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AddressInput, { isOutsideVic } from './AddressInput';
import CheckRow from './CheckRow';
import QuoteDisplay from './QuoteDisplay';
import { BUSINESS, PHONE_HREF } from '@/lib/business';
import { calculateQuote } from '@/lib/pricing';
import { serviceName } from '@/lib/services';
import { useDraft } from '@/lib/useDraft';
import type { BookingFormData, MultiStopType, Place, ServiceType } from '@/types/booking';

const NOTICE_MINUTES = 45;

const RECURRING_OPTIONS = [
  { value: 'every_monday', label: 'Every Monday' },
  { value: 'every_tuesday', label: 'Every Tuesday' },
  { value: 'every_wednesday', label: 'Every Wednesday' },
  { value: 'every_thursday', label: 'Every Thursday' },
  { value: 'every_friday', label: 'Every Friday' },
  { value: 'every_saturday', label: 'Every Saturday' },
  { value: 'every_sunday', label: 'Every Sunday' },
  { value: 'every_weekday', label: 'Every Weekday (Mon–Fri)' },
  { value: 'custom', label: 'Custom' },
];

export interface EstimateSummary {
  pickup: Place;
  dropoff: Place;
  serviceType: ServiceType;
  /** Null for interstate quote requests */
  distanceKm: number | null;
  mptp: boolean;
  isInterstate: boolean;
}

interface Details {
  hasStop: boolean;
  stop: Place | null;
  stopType: 'enroute' | 'deviation';
  /** Extra km the deviation stop adds; null until fetched */
  deviationKm: number | null;
  /** datetime-local value, "YYYY-MM-DDTHH:mm" */
  datetime: string;
  isRecurring: boolean;
  schedule: string;
  customSchedule: string;
  name: string;
  phone: string;
  passengers: number;
  luggage: number;
  babySeat: boolean;
  mptp: boolean;
  ndis: string;
  notes: string;
}

const INITIAL_DETAILS: Details = {
  hasStop: false,
  stop: null,
  stopType: 'enroute',
  deviationKm: null,
  datetime: '',
  isRecurring: false,
  schedule: '',
  customSchedule: '',
  name: '',
  phone: '',
  passengers: 1,
  luggage: 0,
  babySeat: false,
  mptp: false,
  ndis: '',
  notes: '',
};

type FieldKey = 'stop' | 'datetime' | 'schedule' | 'name' | 'phone';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const formatPickup = (d: Date) =>
  d.toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Earliest allowed pickup, rounded up to the next whole minute */
function earliestPickup() {
  const t = new Date(Date.now() + NOTICE_MINUTES * 60_000);
  t.setSeconds(0, 0);
  t.setMinutes(t.getMinutes() + 1);
  return t;
}

/** Accepts 0412 345 678, +61 412 345 678, (03) 9123 4567 … → E.164, or null */
function normaliseAuPhone(input: string): string | null {
  const m = input.replace(/[\s().-]/g, '').match(/^(?:\+61|0061|61|0)([2-478]\d{8})$/);
  return m ? `+61${m[1]}` : null;
}

export default function BookingForm({
  estimate,
  onBack,
  onSubmitted,
}: {
  estimate: EstimateSummary;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const router = useRouter();
  const [d, setD, clearDraft] = useDraft<Details>('booking-draft', { ...INITIAL_DETAILS, mptp: estimate.mptp });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deviationError, setDeviationError] = useState('');
  const [deviationRetry, setDeviationRetry] = useState(0);

  const update = (patch: Partial<Details>, clears?: FieldKey) => {
    setD((prev) => ({ ...prev, ...patch }));
    if (clears) setErrors((prev) => ({ ...prev, [clears]: undefined }));
  };

  const { pickup, dropoff, serviceType, distanceKm } = estimate;
  const isWheelchair = serviceType === 'wheelchair';
  const isParcel = serviceType === 'parcel';
  const isInterstate = estimate.isInterstate || isOutsideVic(d.stop);
  const multiStop: MultiStopType = d.hasStop && d.stop ? d.stopType : 'none';

  // A deviation stop is charged per extra km — ask the server how far off-route it is
  const stopPlaceId = d.stop?.placeId;
  const needsDeviation = !isInterstate && multiStop === 'deviation' && d.deviationKm === null;
  useEffect(() => {
    if (!needsDeviation || !stopPlaceId) return;
    let cancelled = false;
    setDeviationError('');
    fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickupPlaceId: pickup.placeId, dropoffPlaceId: dropoff.placeId, stopPlaceId }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Couldn’t work out the extra distance.');
        if (!cancelled) setD((prev) => ({ ...prev, deviationKm: data.deviationKm }));
      })
      .catch((err) => {
        if (!cancelled) {
          setDeviationError(err instanceof TypeError ? 'Couldn’t reach the server — check your connection.' : err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [needsDeviation, stopPlaceId, pickup.placeId, dropoff.placeId, deviationRetry, setD]);

  // Live price — updates as extras change. Tariff follows the chosen pickup time.
  const quote = useMemo(
    () =>
      isInterstate || distanceKm === null
        ? null
        : calculateQuote({
            serviceType,
            distanceKm,
            babySeat: !isParcel && d.babySeat,
            multiStop,
            deviationKm: d.deviationKm ?? 0,
            mptp: isWheelchair && d.mptp,
            pickupTime: d.datetime ? new Date(d.datetime) : undefined,
          }),
    [isInterstate, distanceKm, serviceType, isParcel, d.babySeat, multiStop, d.deviationKm, isWheelchair, d.mptp, d.datetime],
  );

  const earliest = earliestPickup();
  const tooSoon = d.datetime !== '' && new Date(d.datetime) < earliest;
  const datetimeError =
    errors.datetime ??
    (tooSoon ? `Pickup must be at least ${NOTICE_MINUTES} minutes from now — earliest is ${formatPickup(earliest)}.` : undefined);

  function validate() {
    const e: Partial<Record<FieldKey, string>> = {};
    if (d.hasStop && !d.stop) e.stop = 'Choose the stop address from the suggestions, or turn off “Add a stop”.';
    else if (needsDeviation) e.stop = 'Still working out the detour distance — try again in a moment.';

    if (!d.datetime) e.datetime = 'Choose a pickup date and time.';
    else if (new Date(d.datetime) < earliestPickup()) {
      e.datetime = `Pickup must be at least ${NOTICE_MINUTES} minutes from now — earliest is ${formatPickup(earliestPickup())}.`;
    }

    if (d.isRecurring && !d.schedule) e.schedule = 'Choose how often this ride repeats.';
    else if (d.isRecurring && d.schedule === 'custom' && !d.customSchedule.trim()) {
      e.schedule = 'Describe the schedule, e.g. “Mon, Wed and Fri”.';
    }

    if (!d.name.trim()) e.name = 'Enter your name.';
    const phone = normaliseAuPhone(d.phone);
    if (!d.phone.trim()) e.phone = 'Enter your phone number.';
    else if (!phone) e.phone = 'Enter an Australian phone number, e.g. 0412 345 678.';

    return { errors: e, phone };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError('');
    const { errors: found, phone } = validate();
    setErrors(found);
    if (Object.keys(found).length > 0 || !phone) {
      setSubmitError('Please fix the highlighted fields above.');
      return;
    }

    const payload: BookingFormData = {
      serviceType,
      pickup,
      dropoff,
      stops: multiStop !== 'none' && d.stop ? [{ ...d.stop, type: multiStop }] : [],
      bookingDatetime: new Date(d.datetime).toISOString(),
      isRecurring: d.isRecurring,
      recurringSchedule: d.isRecurring
        ? d.schedule === 'custom'
          ? `custom: ${d.customSchedule.trim()}`
          : d.schedule
        : undefined,
      customerName: d.name.trim(),
      customerPhone: phone,
      passengerCount: isParcel ? undefined : d.passengers,
      luggageCount: d.luggage,
      babySeat: !isParcel && d.babySeat,
      mptpCard: isWheelchair && d.mptp,
      ndisNumber: isWheelchair && d.ndis.trim() ? d.ndis.trim() : undefined,
      notes: d.notes.trim() || undefined,
      isInterstate,
    };

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.id !== 'string') {
        throw new Error(data.error || `Sorry, we couldn’t save your booking. Please try again or call ${BUSINESS.phoneDisplay}.`);
      }
      clearDraft();
      onSubmitted();
      router.push(`/confirmation?ref=${encodeURIComponent(data.id)}`);
    } catch (err) {
      setSubmitError(
        err instanceof TypeError
          ? 'The connection dropped. Your details are saved on this device — tap the button again when you have signal.'
          : (err as Error).message,
      );
      setSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-8">
      <button type="button" onClick={onBack} className="btn-secondary">
        ← Back to quote
      </button>

      {/* Step 1 — already chosen in the estimator */}
      <section aria-labelledby="step1" className="rounded-xl bg-navy-50 p-4">
        <h2 id="step1" className="text-lg font-bold">
          1. Your trip
        </h2>
        <p className="mt-1 font-semibold text-navy-800">
          {serviceName(serviceType)}
          {distanceKm !== null && ` · ${distanceKm} km`}
        </p>
        <dl className="mt-2 space-y-1 text-base">
          <div>
            <dt className="inline font-semibold">From: </dt>
            <dd className="inline">{pickup.address}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">To: </dt>
            <dd className="inline">{dropoff.address}</dd>
          </div>
        </dl>
      </section>

      {/* Step 2 — Extras */}
      <fieldset className="space-y-4">
        <legend className="mb-3 text-lg font-bold">2. Extras</legend>

        <CheckRow
          id="has-stop"
          checked={d.hasStop}
          onChange={(hasStop) => update(hasStop ? { hasStop } : { hasStop, stop: null, deviationKm: null }, 'stop')}
          label="Add a stop?"
        />

        {d.hasStop && (
          <div className="space-y-3 border-l-4 border-amber-400 pl-3">
            <AddressInput
              label="Stop address"
              placeholder="Where should we stop?"
              value={d.stop}
              onChange={(stop) => update({ stop, deviationKm: null }, 'stop')}
            />
            {errors.stop && <p className="field-error">{errors.stop}</p>}

            <div role="radiogroup" aria-label="Stop type" className="space-y-2">
              {(
                [
                  { id: 'enroute', label: 'En route (+$10)', hint: 'On the way — no detour' },
                  { id: 'deviation', label: 'Deviation (+$15 + km)', hint: 'Off the direct route — extra km charged' },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.id}
                  className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                    d.stopType === opt.id ? 'border-navy-700 bg-navy-50' : 'border-navy-200 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="stop-type"
                    checked={d.stopType === opt.id}
                    onChange={() => update({ stopType: opt.id })}
                    className="h-6 w-6 shrink-0 accent-navy-800"
                  />
                  <span>
                    <span className="block font-semibold">{opt.label}</span>
                    <span className="block text-sm text-navy-600">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            {multiStop === 'deviation' && !isInterstate && (
              <p className="text-sm text-navy-700" aria-live="polite">
                {d.deviationKm !== null ? (
                  `The detour adds ${d.deviationKm} km.`
                ) : deviationError ? (
                  <>
                    <span className="text-red-700">{deviationError}</span>{' '}
                    <button type="button" className="font-semibold underline" onClick={() => setDeviationRetry((n) => n + 1)}>
                      Try again
                    </button>
                  </>
                ) : (
                  'Working out the detour distance…'
                )}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="pickup-time" className="field-label">
            Pickup date &amp; time
          </label>
          <input
            id="pickup-time"
            type="datetime-local"
            min={toLocalInput(earliest)}
            value={d.datetime}
            onChange={(e) => update({ datetime: e.target.value }, 'datetime')}
            aria-invalid={!!datetimeError}
            aria-describedby="pickup-time-help"
            className="field-input"
          />
          <p id="pickup-time-help" className={datetimeError ? 'field-error' : 'mt-1 text-sm text-navy-600'}>
            {datetimeError ?? `Book at least ${NOTICE_MINUTES} minutes ahead.`}
          </p>
          {datetimeError && (
            <p className="mt-1 text-sm">
              Need a ride sooner?{' '}
              <a href={PHONE_HREF} className="font-semibold text-navy-800 underline">
                Call {BUSINESS.phoneDisplay}
              </a>
            </p>
          )}
        </div>

        <CheckRow
          id="recurring"
          checked={d.isRecurring}
          onChange={(isRecurring) => update({ isRecurring }, 'schedule')}
          label="Recurring booking"
          hint="Same ride on a regular schedule"
        />
        {d.isRecurring && (
          <div className="space-y-3 border-l-4 border-amber-400 pl-3">
            <div>
              <label htmlFor="schedule" className="field-label">
                Repeats
              </label>
              <select
                id="schedule"
                value={d.schedule}
                onChange={(e) => update({ schedule: e.target.value }, 'schedule')}
                aria-invalid={!!errors.schedule}
                className="field-input"
              >
                <option value="">Choose…</option>
                {RECURRING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {d.schedule === 'custom' && (
              <div>
                <label htmlFor="custom-schedule" className="field-label">
                  Describe the schedule
                </label>
                <input
                  id="custom-schedule"
                  type="text"
                  placeholder="e.g. Mon, Wed and Fri"
                  value={d.customSchedule}
                  onChange={(e) => update({ customSchedule: e.target.value }, 'schedule')}
                  className="field-input"
                />
              </div>
            )}
            {errors.schedule && <p className="field-error">{errors.schedule}</p>}
          </div>
        )}
      </fieldset>

      {/* Step 3 — Customer details */}
      <fieldset className="space-y-4">
        <legend className="mb-3 text-lg font-bold">3. Your details</legend>

        <div>
          <label htmlFor="name" className="field-label">
            Name <span className="text-red-700">*</span>
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={d.name}
            onChange={(e) => update({ name: e.target.value }, 'name')}
            aria-invalid={!!errors.name}
            className="field-input"
          />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="field-label">
            Mobile phone <span className="text-red-700">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0412 345 678"
            value={d.phone}
            onChange={(e) => update({ phone: e.target.value }, 'phone')}
            aria-invalid={!!errors.phone}
            className="field-input"
          />
          {errors.phone ? (
            <p className="field-error">{errors.phone}</p>
          ) : (
            <p className="mt-1 text-sm text-navy-600">We’ll text your booking confirmation here.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!isParcel && (
            <Stepper
              label="Passengers"
              value={d.passengers}
              min={1}
              max={11}
              onChange={(passengers) => update({ passengers })}
            />
          )}
          <Stepper
            label={isParcel ? 'Number of parcels' : 'Luggage (bags)'}
            value={d.luggage}
            min={0}
            max={20}
            onChange={(luggage) => update({ luggage })}
          />
        </div>

        {!isParcel && (
          <CheckRow
            id="baby-seat"
            checked={d.babySeat}
            onChange={(babySeat) => update({ babySeat })}
            label="Baby seat"
            price="+$10"
          />
        )}

        {isWheelchair && (
          <>
            <CheckRow
              id="mptp"
              checked={d.mptp}
              onChange={(mptp) => update({ mptp })}
              label="MPTP / M31 card"
              hint="50% off the metered fare"
            />
            {d.mptp && (
              <p className="rounded-lg bg-navy-50 p-3 text-sm text-navy-800">
                $31.70 lifting fee is paid from your M31 card, on top of your share of the fare.{' '}
                <strong>M31 card verified by driver at pickup.</strong>
              </p>
            )}
            <div>
              <label htmlFor="ndis" className="field-label">
                NDIS plan number <span className="font-normal text-navy-600">(optional)</span>
              </label>
              <input
                id="ndis"
                type="text"
                inputMode="numeric"
                value={d.ndis}
                onChange={(e) => update({ ndis: e.target.value })}
                className="field-input"
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="notes" className="field-label">
            Notes / special instructions
          </label>
          <textarea
            id="notes"
            rows={3}
            placeholder={
              isParcel
                ? 'What are we delivering? Size, weight, who receives it…'
                : 'Gate codes, mobility needs, where to meet you…'
            }
            value={d.notes}
            onChange={(e) => update({ notes: e.target.value })}
            className="field-input py-2"
          />
        </div>
      </fieldset>

      {/* Final price */}
      <section aria-labelledby="price-heading" aria-live="polite">
        {isInterstate ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <h2 id="price-heading" className="text-lg font-bold">
              Interstate / long-haul quote
            </h2>
            <p className="mt-1 text-navy-800">
              These trips are priced individually. Send your request and we’ll call you within 1 hour with a quote.
            </p>
          </div>
        ) : (
          quote && (
            <>
              <h2 id="price-heading" className="mb-3 text-lg font-bold">
                Your price
              </h2>
              <QuoteDisplay
                quote={quote}
                footnote={
                  d.hasStop && !d.stop
                    ? 'Stop charges are added once you choose the stop address.'
                    : needsDeviation
                      ? 'Detour km will be added once calculated.'
                      : undefined
                }
              />
            </>
          )
        )}
      </section>

      {submitError && (
        <p className="field-error" role="alert">
          {submitError}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting
          ? 'Sending…'
          : isInterstate
            ? 'Submit Quote Request — we’ll call you within 1 hour'
            : 'Confirm Booking'}
      </button>
    </form>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const btn =
    'flex h-12 w-12 items-center justify-center rounded-lg border border-navy-200 bg-white text-2xl font-bold text-navy-800 disabled:opacity-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400';
  return (
    <div role="group" aria-label={label}>
      <span className="field-label">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" className={btn} aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <output aria-live="polite" className="w-8 text-center text-xl font-bold tabular-nums">
          {value}
        </output>
        <button type="button" className={btn} aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}
