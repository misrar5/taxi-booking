import type { ServiceType } from '@/types/booking';

// Simple line icons, inline so they cost no extra requests
const PATHS: Record<ServiceType, React.ReactNode> = {
  wheelchair: (
    <>
      <circle cx="11" cy="4" r="2" />
      <path d="M11 7v6h5l2.5 6" />
      <path d="M8 10.5a5.5 5.5 0 1 0 7.5 7" />
    </>
  ),
  suv: (
    <>
      <path d="M3 16v-3.5l2-4.5a2 2 0 0 1 1.8-1.2h10.4A2 2 0 0 1 19 8l2 4.5V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M3.5 12.5h17" />
      <circle cx="7.5" cy="17" r="1.8" />
      <circle cx="16.5" cy="17" r="1.8" />
    </>
  ),
  maxi: (
    <>
      <path d="M2 16V7a1 1 0 0 1 1-1h12.5l5.5 5.5V16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
      <path d="M15 6v5.5h6M8 6v5.5M2 11.5h13" />
      <circle cx="6.5" cy="17" r="1.8" />
      <circle cx="16.5" cy="17" r="1.8" />
    </>
  ),
  parcel: (
    <>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
      <path d="m3 7.5 9 4.5 9-4.5M12 12v9M7.5 5.2l9 4.6" />
    </>
  ),
};

export default function ServiceIcon({ service, className }: { service: ServiceType; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[service]}
    </svg>
  );
}
