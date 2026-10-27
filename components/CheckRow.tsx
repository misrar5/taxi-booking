'use client';

/** Full-width checkbox row with a large tap target */
export default function CheckRow({
  id,
  checked,
  onChange,
  label,
  hint,
  price,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  price?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
        checked ? 'border-navy-700 bg-navy-50' : 'border-navy-200 bg-white'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-6 w-6 shrink-0 accent-navy-800"
      />
      <span className="flex-1">
        <span className="font-semibold text-navy-950">{label}</span>
        {hint && <span className="block text-sm text-navy-600">{hint}</span>}
      </span>
      {price && <span className="shrink-0 font-semibold text-navy-800">{price}</span>}
    </label>
  );
}
