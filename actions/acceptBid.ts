"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { AssignmentStatus } from "@prisma/client";

export async function acceptBid(bidId: string) {
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      throw new Error("Unauthorized");
    }
    
    // Get the bid details
    const bid = await prisma.bid.findUnique({
      where: {
        id: bidId,
      },
      include: {
        assignment: true,
        user: true,
      },
    });
    
    if (!bid) {
      throw new Error("Bid not found");
    }
    
    // Verify the poster owns the task
    if (bid.assignment.posterId !== userId) {
      throw new Error("Unauthorized - you don't own this assignment");
    }
    
    // Check if the task is still open
    if (bid.assignment.status !== AssignmentStatus.OPEN) {
      throw new Error("This task is no longer open for bidding");
    }
    
    // Return the information needed for the payment process
    return {
      success: true,
      bidId: bid.id,
      taskId: bid.assignmentId,
      amount: bid.bidAmount,
      doerId: bid.userId,
    };
  } catch (error: any) {
    console.error("Accept bid error:", error);
    return {
      success: false,
      error: error.message || "Failed to accept bid",
    };
  }
} 