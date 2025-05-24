import { NextResponse } from 'next/server';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ;
  // Redirect to failure page
  return NextResponse.redirect(new URL('/payment-failed', appUrl));
} 