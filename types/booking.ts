export type ServiceType = 'wheelchair' | 'suv' | 'maxi' | 'parcel';

export type BookingStatus = 'new' | 'confirmed' | 'in_progress' | 'done' | 'cancelled';

/** 1 = standard hours, 2 = nights/weekends */
export type Tariff = 1 | 2;

export type MultiStopType = 'none' | 'enroute' | 'deviation';

export interface QuoteLineItem {
  label: string;
  /** Dollars. Negative for discounts (e.g. MPTP subsidy). */
  amount: number;
  note?: string;
  /** Explanatory line with no charge (e.g. the tariff rate applied) — hide the amount */
  info?: boolean;
}

export interface QuoteResult {
  /** Every charge and discount, in display order. Sums to `total`. */
  lineItems: QuoteLineItem[];
  /** Applied automatically from the pickup time — never chosen by the customer */
  tariff: Tariff;
  /** Fare before MPTP discount, excluding the lifting fee */
  subtotal: number;
  mptpDiscount: number;
  /** $31.70 if MPTP wheelchair, else 0 */
  liftingFee: number;
  total: number;
  /** true for wheelchair (meter fare) */
  isEstimate: boolean;
  estimateDisclaimer?: string;
}

/** An address picked from Google Places Autocomplete */
export interface Place {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
  /** Australian state short code, e.g. "VIC". Used to detect interstate trips. */
  state?: string;
}

export interface BookingStop extends Place {
  type: Exclude<MultiStopType, 'none'>;
}

/** Full customer submission from the booking form (POST /api/bookings) */
export interface BookingFormData {
  serviceType: ServiceType;

  pickup: Place;
  dropoff: Place;
  /** Extra stops in travel order */
  stops: BookingStop[];

  /** ISO 8601. Must be at least 45 min from submission time. */
  bookingDatetime: string;
  isRecurring: boolean;
  /** e.g. "every_monday", "every_weekday", "custom: Mon/Wed/Fri" */
  recurringSchedule?: string;

  customerName: string;
  /** E.164, e.g. "+61412345678" */
  customerPhone: string;

  /** Not collected for parcel */
  passengerCount?: number;
  /** Bags, or number of items for parcel */
  luggageCount?: number;
  babySeat: boolean;
  /** Wheelchair only. Card is verified physically by the driver at pickup. */
  mptpCard: boolean;
  /** Wheelchair only */
  ndisNumber?: string;
  notes?: string;

  /** Interstate/long haul — quote request only, no auto-price */
  isInterstate: boolean;
}

/** Full database record (mirrors supabase/schema.sql, camelCased) */
export interface Booking extends BookingFormData {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: BookingStatus;

  /** getTariff(bookingDatetime), set server-side */
  tariff: Tariff;
  /** From Google at booking time. Null for interstate quote requests. */
  distanceKm: number | null;
  /** Full QuoteResult shown to the customer at booking time */
  quoteBreakdown: QuoteResult | null;
  estimatedFare: number | null;
  /** $7.00 non-refundable pre-booking fee */
  preBookingFeePaid: boolean;

  waitStartedAt: string | null;
  /** Billable minutes after the 7 min free buffer */
  waitMinutesCharged: number;

  /** Driver/admin only — never shown to the customer */
  driverNotes: string | null;

  reviewRequestSent: boolean;
  reviewRequestSentAt: string | null;
}
