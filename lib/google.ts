// Server-only Google Maps Platform calls (Places API (New) + Routes API).
// Called from API routes so the browser never loads the heavy Maps JS SDK
// and the API key stays on the server.

const MELBOURNE_CBD = { latitude: -37.8136, longitude: 144.9631 };

export class NoRouteError extends Error {}

function apiKey(): string {
  const key = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_SERVER_API_KEY is not set');
  return key;
}

/** Google place IDs are URL-safe base64-style strings */
export const isPlaceId = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9_-]{1,300}$/.test(v);

export interface AddressSuggestion {
  placeId: string;
  /** Full text, e.g. "Royal Melbourne Hospital, Grattan Street, Parkville VIC, Australia" */
  text: string;
  main: string;
  secondary: string;
}

export async function autocompleteAddress(input: string, sessionToken: string): Promise<AddressSuggestion[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey() },
    body: JSON.stringify({
      input,
      ...(sessionToken && { sessionToken }),
      includedRegionCodes: ['au'],
      locationBias: { circle: { center: MELBOURNE_CBD, radius: 50000 } },
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Places autocomplete ${res.status}: ${await res.text()}`);

  const data: {
    suggestions?: {
      placePrediction?: {
        placeId: string;
        text?: { text: string };
        structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
      };
    }[];
  } = await res.json();

  return (data.suggestions ?? []).flatMap(({ placePrediction: p }) => {
    if (!p) return [];
    const text = p.text?.text ?? p.structuredFormat?.mainText?.text ?? '';
    return [
      {
        placeId: p.placeId,
        text,
        main: p.structuredFormat?.mainText?.text ?? text,
        secondary: p.structuredFormat?.secondaryText?.text ?? '',
      },
    ];
  });
}

export async function getPlaceLocation(
  placeId: string,
  sessionToken: string,
): Promise<{ lat: number; lng: number; state?: string }> {
  const url = new URL(`https://places.googleapis.com/v1/places/${placeId}`);
  if (sessionToken) url.searchParams.set('sessionToken', sessionToken);

  const res = await fetch(url, {
    headers: { 'X-Goog-Api-Key': apiKey(), 'X-Goog-FieldMask': 'location,addressComponents' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Place details ${res.status}: ${await res.text()}`);

  const data: {
    location: { latitude: number; longitude: number };
    addressComponents?: { shortText?: string; types?: string[] }[];
  } = await res.json();

  const state = data.addressComponents?.find((c) => c.types?.includes('administrative_area_level_1'))?.shortText;
  return { lat: data.location.latitude, lng: data.location.longitude, state };
}

const roundKm = (metres: number) => Math.round(metres / 100) / 10;

/**
 * Driving distance pickup → dropoff. With a stop, also how many extra km the
 * detour via the stop adds (pickup → stop → dropoff minus the direct route).
 */
export async function getRouteDistances(
  pickupPlaceId: string,
  dropoffPlaceId: string,
  stopPlaceId?: string,
): Promise<{ distanceKm: number; deviationKm: number }> {
  const waypoint = (placeId: string) => ({ waypoint: { placeId } });
  // origins [pickup, stop] × destinations [dropoff, stop] gives every leg in one call
  const origins = [waypoint(pickupPlaceId)];
  const destinations = [waypoint(dropoffPlaceId)];
  if (stopPlaceId) {
    origins.push(waypoint(stopPlaceId));
    destinations.push(waypoint(stopPlaceId));
  }

  const res = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey(),
      'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,condition',
    },
    body: JSON.stringify({ origins, destinations, travelMode: 'DRIVE' }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Route matrix ${res.status}: ${await res.text()}`);

  // Proto3 JSON omits zero values, so a missing index means 0
  const elements: { originIndex?: number; destinationIndex?: number; distanceMeters?: number; condition?: string }[] =
    await res.json();
  const metres = (origin: number, destination: number) => {
    const e = elements.find((x) => (x.originIndex ?? 0) === origin && (x.destinationIndex ?? 0) === destination);
    if (!e || e.condition !== 'ROUTE_EXISTS') throw new NoRouteError('No driving route found');
    return e.distanceMeters ?? 0;
  };

  const direct = metres(0, 0);
  const detour = stopPlaceId ? Math.max(0, metres(0, 1) + metres(1, 0) - direct) : 0;
  return { distanceKm: roundKm(direct), deviationKm: roundKm(detour) };
}
