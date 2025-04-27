"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Client component that uses useSearchParams
function PaymentErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "An unexpected error occurred with your payment";

  return (
    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-8 rounded-lg max-w-2xl w-full mb-8">
      <div className="flex items-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-red-500 mr-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h1 className="text-2xl font-bold">Payment Failed</h1>
      </div>
      
      <p className="mb-6">{reason}</p>
      
      <div className="bg-white p-4 rounded border border-red-200 mb-6">
        <h2 className="font-semibold text-lg mb-2">What happened?</h2>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>Your payment could not be processed at this time</li>
          <li>The payment might have been declined by eSewa</li>
          <li>There might have been a technical issue during payment processing</li>
          <li>The connection to the payment gateway might have timed out</li>
        </ul>
      </div>
      
      <h2 className="font-semibold text-lg mb-2">What can you do now?</h2>
      <ul className="list-disc list-inside space-y-2 text-sm mb-6">
        <li>Check your eSewa account to ensure you have sufficient balance</li>
        <li>Try the payment again later</li>
        <li>Contact support if the issue persists</li>
      </ul>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild variant="default" className="flex-1">
          <Link href="/poster/tasks">
            Return to My Tasks
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/payment-test">
            Go to Payment Test Page
          </Link>
        </Button>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function PaymentErrorFallback() {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-8 rounded-lg max-w-2xl w-full mb-8">
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-700"></div>
        <span className="ml-2">Loading...</span>
      </div>
    </div>
  );
}

export default function PaymentErrorPage() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen py-12 px-4">
      <Suspense fallback={<PaymentErrorFallback />}>
        <PaymentErrorContent />
      </Suspense>
    </div>
  );
} 