// Minimal confirmation page so the booking redirect has somewhere to land.
// TODO: load the booking by ref and show its details.
import Link from 'next/link';
import { BUSINESS, PHONE_HREF } from '@/lib/business';

export default function ConfirmationPage({ searchParams }: { searchParams: { ref?: string } }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold">Booking received</h1>
      {searchParams.ref && (
        <p className="mt-2 text-navy-700">
          Reference: <span className="font-mono font-semibold">{searchParams.ref}</span>
        </p>
      )}
      <p className="mt-4">We’ll text you to confirm. Questions? Call us on {BUSINESS.phoneDisplay}.</p>
      <div className="mt-6 flex flex-col gap-3">
        <a href={PHONE_HREF} className="btn-primary">
          Call {BUSINESS.phoneDisplay}
        </a>
        <Link href="/" className="btn-secondary">
          Back to home
        </Link>
      </div>
    </main>
  );
}
