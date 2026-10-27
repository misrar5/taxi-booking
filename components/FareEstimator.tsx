'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import AddressInput, { isOutsideVic } from './AddressInput';
import CheckRow from './CheckRow';
import QuoteDisplay from './QuoteDisplay';
import ServiceSelector from './ServiceSelector';
import { calculateQuote } from '@/lib/pricing';
import { SERVICES, serviceName } from '@/lib/services';
import { useDraft } from '@/lib/useDraft';
import type { Place, ServiceType } from '@/types/booking';

// Only downloaded once the customer taps "Book this ride" — keeps first load small
const BookingForm = dynamic(() => import('./BookingForm'), {
  ssr: false,
  loading: () => <p className="py-10 text-center text-navy-700">Loading booking form…</p>,
});

interface EstimateState {
  pickup: Place | null;
  dropoff: Place | null;
  serviceType: ServiceType;
  mptp: boolean;
  isInterstate: boolean;
  /** Set by "Get Instant Fare"; cleared whenever an address changes */
  distanceKm: number | null;
  showBooking: boolean;
}

const INITIAL: EstimateState = {
  pickup: null,
  dropoff: null,
  serviceType: 'wheelchair',
  mptp: false,
  isInterstate: false,
  distanceKm: null,
  showBooking: false,
};

export default function FareEstimator() {
  const [s, setS, clearDraft] = useDraft('estimate-draft', INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<EstimateState>) => setS((prev) => ({ ...prev, ...patch }));

  // "Book now →" links on the service cards point at #book-<service>
  useEffect(() => {
    const applyHash = () => {
      const id = window.location.hash.match(/^#book-(\w+)$/)?.[1];
      const service = SERVICES.find((x) => x.id === id);
      if (!service) return;
      setS((prev) => ({ ...prev, serviceType: service.id, showBooking: false }));
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', window.location.pathname);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [setS]);

  const setPlace = (field: 'pickup' | 'dropoff', place: Place | null) => {
    setError('');
    update({ [field]: place, distanceKm: null, ...(isOutsideVic(place) && { isInterstate: true }) });
  };

  const isWheelchair = s.serviceType === 'wheelchair';

  // Recalculated instantly when service/MPTP change — no network needed.
  // Tariff comes from the current time; the booking form re-prices for the chosen pickup time.
  const quote = useMemo(
    () =>
      s.distanceKm === null || s.isInterstate
        ? null
        : calculateQuote({
            serviceType: s.serviceType,
            distanceKm: s.distanceKm,
            babySeat: false,
            multiStop: 'none',
            deviationKm: 0,
            mptp: isWheelchair && s.mptp,
          }),
    [s.distanceKm, s.isInterstate, s.serviceType, s.mptp, isWheelchair],
  );

  function openBooking() {
    update({ showBooking: true });
    requestAnimationFrame(() => cardRef.current?.scrollIntoView({ block: 'start' }));
  }

  async function getQuote() {
    setError('');
    if (!s.pickup || !s.dropoff) {
      setError('Choose your pickup and drop-off addresses from the suggestions list.');
      return;
    }
    if (s.isInterstate) {
      openBooking();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupPlaceId: s.pickup.placeId, dropoffPlaceId: s.dropoff.placeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Couldn’t calculate the fare. Please try again.');
      update({ distanceKm: data.distanceKm });
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'You appear to be offline. Reconnect and try again, or give us a call.'
          : (err as Error).message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={cardRef}
      id="fare"
      className="scroll-mt-20 rounded-2xl bg-white p-5 text-navy-950 shadow-[0_20px_50px_-12px_rgba(15,28,63,0.35)] ring-1 ring-navy-900/5 sm:p-8"
    >
      {s.showBooking && s.pickup && s.dropoff ? (
        <BookingForm
          estimate={{
            pickup: s.pickup,
            dropoff: s.dropoff,
            serviceType: s.serviceType,
            distanceKm: s.distanceKm,
            mptp: isWheelchair && s.mptp,
            isInterstate: s.isInterstate,
          }}
          onBack={() => update({ showBooking: false })}
          onSubmitted={clearDraft}
        />
      ) : (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-navy-900">Get an instant fare</h2>

          <AddressInput label="Pickup" placeholder="Pickup address" value={s.pickup} onChange={(p) => setPlace('pickup', p)} />
          <AddressInput
            label="Drop-off"
            placeholder="Drop-off address"
            value={s.dropoff}
            onChange={(p) => setPlace('dropoff', p)}
          />

          <div>
            <span id="service-label" className="field-label">
              Service
            </span>
            <ServiceSelector
              labelledBy="service-label"
              value={s.serviceType}
              onChange={(serviceType) => update({ serviceType })}
            />
          </div>

          <div className="space-y-3">
            {isWheelchair && (
              <CheckRow
                id="est-mptp"
                checked={s.mptp}
                onChange={(mptp) => update({ mptp })}
                label="I have an MPTP / M31 card — $31.70 lifting fee applies"
              />
            )}
            <CheckRow
              id="est-interstate"
              checked={s.isInterstate}
              onChange={(isInterstate) => update({ isInterstate })}
              label="Interstate or long-haul trip — we’ll quote personally"
            />
          </div>

          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}

          <button type="button" onClick={getQuote} disabled={loading} className="btn-primary">
            {loading ? 'Calculating…' : s.isInterstate ? 'Request a Quote →' : 'Get Instant Fare →'}
          </button>

          {quote && (
            <div aria-live="polite" className="space-y-4 border-t-2 border-navy-50 pt-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-bold text-navy-900">Your {serviceName(s.serviceType)} fare</h3>
                <span className="text-base text-navy-600">{s.distanceKm} km</span>
              </div>
              <QuoteDisplay quote={quote} />
              <button type="button" onClick={openBooking} className="btn-primary">
                Book this ride →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
