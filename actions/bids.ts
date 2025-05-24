"use server";

import { acceptBid as acceptBidOriginal } from "./acceptBid";

// Re-export with correct signature to match component usage
export async function acceptBid(bidId: string) {
  return acceptBidOriginal(bidId);
} 