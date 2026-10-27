import FareEstimator from '@/components/FareEstimator';
import ServiceIcon from '@/components/ServiceIcon';
import { BUSINESS, PHONE_HREF } from '@/lib/business';
import { SERVICES } from '@/lib/services';

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
    </svg>
  );
}

export default function HomePage() {
  const trust = [
    { label: 'ABN', value: BUSINESS.abn },
    ...(BUSINESS.ndisRegistered ? [{ label: 'NDIS Provider', value: 'Registered' }] : []),
    {
      label: 'Google Rating',
      value: `★ ${BUSINESS.googleRating.toFixed(1)}`,
      detail: `${BUSINESS.googleReviewCount} reviews`,
    },
    { label: 'Serving Melbourne', value: `${BUSINESS.yearsServing}+ years` },
  ];

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <span className="text-xl font-bold text-white">{BUSINESS.name}</span>
          <a
            href={PHONE_HREF}
            className="inline-flex min-h-[48px] items-center gap-2 text-lg font-bold text-amber-400 hover:text-amber-300 sm:text-xl"
          >
            <PhoneIcon className="h-5 w-5" />
            {BUSINESS.phoneDisplay}
          </a>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="bg-navy-900 px-4 pb-36 pt-10 sm:px-6 sm:pt-14">
          <div className="mx-auto max-w-3xl text-center md:text-left">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
              Melbourne’s trusted taxi service
            </h1>
            <p className="mt-3 text-lg text-slate-300">Wheelchair · SUV · Maxi · Parcel — Instant fare, no surprises.</p>
          </div>
        </section>

        {/* Estimator card overlaps the hero into the white section */}
        <div className="relative -mt-28 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <FareEstimator />
          </div>
        </div>

        {/* Services */}
        <section aria-labelledby="services-heading" className="px-4 pb-6 pt-16 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 id="services-heading" className="mb-6 text-3xl font-bold text-navy-900">
              Our services
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {SERVICES.map((s) => (
                <li key={s.id} className="flex flex-col rounded-2xl border-2 border-navy-100 bg-white p-4 sm:p-5">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-amber-400">
                    <ServiceIcon service={s.id} className="h-7 w-7" />
                  </span>
                  <h3 className="text-lg font-bold text-navy-900">{s.name}</h3>
                  <p className="mt-1 flex-1 text-base text-navy-700">{s.description}</p>
                  <a
                    href={`#book-${s.id}`}
                    className="mt-3 inline-flex min-h-[44px] items-center text-base font-bold text-navy-900 underline-offset-4 hover:underline"
                  >
                    Book now <span aria-hidden="true">&nbsp;→</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Trust */}
        <section aria-labelledby="trust-heading" className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 id="trust-heading" className="mb-6 text-3xl font-bold text-navy-900">
              Why book with us
            </h2>
            <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {trust.map((t) => (
                <div key={t.label} className="rounded-2xl bg-navy-50 p-5">
                  <dt className="text-sm font-bold uppercase tracking-wide text-navy-600">{t.label}</dt>
                  <dd className="mt-2 text-2xl font-extrabold text-navy-900">{t.value}</dd>
                  {t.detail && <dd className="text-base text-navy-700">{t.detail}</dd>}
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      {/* pb-28 on mobile leaves room for the floating call button */}
      <footer className="bg-navy-900 px-4 pb-28 pt-8 text-slate-300 sm:px-6 md:pb-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 text-base sm:flex-row sm:items-center sm:justify-between">
          <span className="font-bold text-white">{BUSINESS.name}</span>
          <span>ABN {BUSINESS.abn}</span>
          <a href={PHONE_HREF} className="inline-flex min-h-[44px] items-center font-bold text-amber-400">
            {BUSINESS.phoneDisplay}
          </a>
        </div>
      </footer>

      {/* Sticky call button — mobile only */}
      <a
        href={PHONE_HREF}
        className="fixed inset-x-4 bottom-4 z-40 flex min-h-[56px] items-center justify-center rounded-full bg-amber-400 text-lg font-bold text-navy-900 shadow-[0_8px_24px_rgba(15,28,63,0.35)] md:hidden"
      >
        📞 Call us
      </a>
    </>
  );
}
