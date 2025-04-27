import { NextResponse } from 'next/server';

export async function GET() {
  // Redirect to failure page
  return NextResponse.redirect(new URL('/payment-failed', process.env.NEXT_PUBLIC_APP_URL));
} 