import type { ServiceType } from '@/types/booking';

export interface ServiceInfo {
  id: ServiceType;
  name: string;
  /** Two-line description for the homepage service cards */
  description: string;
}

export const SERVICES: ServiceInfo[] = [
  {
    id: 'wheelchair',
    name: 'Wheelchair',
    description: 'Ramp access. MPTP & NDIS accepted.',
  },
  {
    id: 'suv',
    name: 'SUV',
    description: 'Extra comfort and room for luggage.',
  },
  {
    id: 'maxi',
    name: 'Maxi',
    description: 'Room for groups and big loads.',
  },
  {
    id: 'parcel',
    name: 'Parcel',
    description: 'Same-day delivery across Melbourne.',
  },
];

export const serviceName = (id: ServiceType) => SERVICES.find((s) => s.id === id)?.name ?? id;
