'use client';

import { SERVICES } from '@/lib/services';
import type { ServiceType } from '@/types/booking';

/** Pill tabs: one row on most phones, 2×2 on very narrow screens */
export default function ServiceSelector({
  value,
  onChange,
  labelledBy,
}: {
  value: ServiceType;
  onChange: (service: ServiceType) => void;
  labelledBy: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid grid-cols-2 gap-2 min-[440px]:grid-cols-4">
      {SERVICES.map((s) => {
        const selected = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(s.id)}
            className={`min-h-[48px] rounded-full border-2 px-2 text-base font-bold focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/50 ${
              selected
                ? 'border-navy-900 bg-navy-900 text-white'
                : 'border-navy-200 bg-white text-navy-900 hover:border-navy-900'
            }`}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
