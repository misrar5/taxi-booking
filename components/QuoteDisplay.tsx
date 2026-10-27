import type { QuoteResult } from '@/types/booking';

export const formatAUD = (amount: number) => `${amount < 0 ? '−' : ''}$${Math.abs(amount).toFixed(2)}`;

/** Itemised fare breakdown from a QuoteResult — label left, amount right */
export default function QuoteDisplay({ quote, footnote }: { quote: QuoteResult; footnote?: string }) {
  return (
    <div className="rounded-xl border-2 border-navy-100 bg-white">
      <dl className="divide-y divide-navy-100 px-4">
        {quote.lineItems.map((item, i) =>
          item.info ? (
            <div key={i} className="py-2.5">
              <dt className="text-sm font-semibold text-navy-600">{item.label}</dt>
            </div>
          ) : (
            <div key={i} className="flex items-start justify-between gap-4 py-2.5">
              <dt className="text-base text-navy-900">
                {item.label}
                {item.note && <span className="block text-sm text-navy-600">{item.note}</span>}
              </dt>
              <dd
                className={`shrink-0 text-base tabular-nums ${
                  item.amount < 0 ? 'font-semibold text-green-700' : 'text-navy-950'
                }`}
              >
                {formatAUD(item.amount)}
              </dd>
            </div>
          ),
        )}
      </dl>

      <div className="flex items-baseline justify-between gap-4 border-t-2 border-navy-900 px-4 py-4">
        <span className="text-lg font-bold text-navy-900">{quote.isEstimate ? 'Estimated total' : 'Total'}</span>
        <span className="text-3xl font-extrabold tabular-nums text-navy-900">{formatAUD(quote.total)}</span>
      </div>

      {footnote && <p className="px-4 pb-3 text-sm text-navy-700">{footnote}</p>}

      {quote.isEstimate && quote.estimateDisclaimer && (
        <p role="note" className="mx-3 mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-navy-900">
          {quote.estimateDisclaimer}
        </p>
      )}
    </div>
  );
}
