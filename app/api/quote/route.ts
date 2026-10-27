import { NextResponse } from 'next/server';
import { getRouteDistances, isPlaceId, NoRouteError } from '@/lib/google';

/**
 * POST /api/quote { pickupPlaceId, dropoffPlaceId, stopPlaceId? }
 *   → { distanceKm, deviationKm }
 *
 * Returns distances only. The price itself comes from calculateQuote() in
 * lib/pricing.ts, which runs in the browser so the breakdown updates live as
 * extras change. /api/bookings must recalculate it server-side — never trust
 * a price sent from the browser.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { pickupPlaceId, dropoffPlaceId, stopPlaceId } = body;
  if (!isPlaceId(pickupPlaceId) || !isPlaceId(dropoffPlaceId) || (stopPlaceId != null && !isPlaceId(stopPlaceId))) {
    return NextResponse.json({ error: 'Choose addresses from the suggestions list.' }, { status: 400 });
  }

  try {
    return NextResponse.json(await getRouteDistances(pickupPlaceId, dropoffPlaceId, stopPlaceId ?? undefined));
  } catch (err) {
    if (err instanceof NoRouteError) {
      return NextResponse.json({ error: 'We couldn’t find a driving route between those addresses.' }, { status: 422 });
    }
    console.error('[api/quote]', err);
    return NextResponse.json(
      { error: 'Couldn’t calculate the distance right now. Please try again or call us.' },
      { status: 502 },
    );
  }
}
