// TODO: validate the booking, recalculate the quote server-side (getRouteDistances +
// calculateQuote — never trust the browser's price), insert with getServiceClient(),
// send SMS/email, and return { id }.
import { NextResponse } from 'next/server';
import { BUSINESS } from '@/lib/business';

export async function POST() {
  return NextResponse.json(
    { error: `Online booking isn’t live yet. Please call ${BUSINESS.phoneDisplay} to book.` },
    { status: 501 },
  );
}
