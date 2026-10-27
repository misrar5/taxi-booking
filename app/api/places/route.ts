import { NextResponse, type NextRequest } from 'next/server';
import { autocompleteAddress, getPlaceLocation, isPlaceId } from '@/lib/google';

/**
 * GET /api/places?q=<text>&session=<token>     → { suggestions }
 * GET /api/places?id=<placeId>&session=<token> → { lat, lng, state }
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const session = (params.get('session') ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 36);
  const id = params.get('id');
  const q = params.get('q')?.trim();

  try {
    if (id) {
      if (!isPlaceId(id)) return NextResponse.json({ error: 'Invalid place' }, { status: 400 });
      return NextResponse.json(await getPlaceLocation(id, session));
    }
    if (q && q.length >= 3) {
      return NextResponse.json({ suggestions: await autocompleteAddress(q.slice(0, 200), session) });
    }
    return NextResponse.json({ error: 'Type at least 3 characters' }, { status: 400 });
  } catch (err) {
    console.error('[api/places]', err);
    return NextResponse.json({ error: 'Address search is unavailable right now.' }, { status: 502 });
  }
}
