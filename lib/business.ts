// TODO(owner): replace every value below with your real details before launch.
// These are placeholders — the site shows them as-is.
export const BUSINESS = {
  name: 'Your Taxi Co.',
  /** As shown on screen */
  phoneDisplay: '0400 000 000',
  /** E.164, used for tap-to-call */
  phoneE164: '+61400000000',
  abn: '00 000 000 000',
  ndisRegistered: true,
  googleRating: 5.0,
  googleReviewCount: 0,
  yearsServing: 0,
} as const;

export const PHONE_HREF = `tel:${BUSINESS.phoneE164}`;
