import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { AssignmentStatus } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: "Unauthorized" 
      }, { status: 401 });
    }

    const body = await req.json();
    const { bidId, taskId } = body;

    if (!bidId || !taskId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    // Find the bid
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: {
        assignment: true,
      },
    });

    if (!bid) {
      return NextResponse.json({ 
        success: false, 
        error: "Bid not found" 
      }, { status: 404 });
    }

    // Verify the user is the poster of the task
    if (bid.assignment.posterId !== userId) {
      return NextResponse.json({ 
        success: false, 
        error: "You don't have permission to accept this bid" 
      }, { status: 403 });
    }

    // Check if the task is still open
    if (bid.assignment.status !== AssignmentStatus.OPEN) {
      return NextResponse.json({ 
        success: false, 
        error: "This task is no longer open for accepting bids" 
      }, { status: 400 });
    }

    // Prevent users from accepting their own bids (self-completion of tasks)
    if (bid.userId === userId) {
      return NextResponse.json({ 
        success: false, 
        error: "You cannot accept your own bid on your own task" 
      }, { status: 400 });
    }

    // Start a transaction to update bid status and assignment status
    const result = await prisma.$transaction(async (prisma) => {
      // Update the bid status
      const updatedBid = await prisma.bid.update({
        where: { id: bidId },
        data: { status: "accepted" }
      });

      // Update all other bids for this task to rejected
      await prisma.bid.updateMany({
        where: {
          assignmentId: bid.assignmentId,
          id: { not: bidId }
        },
        data: { status: "rejected" }
      });

      // Update the assignment status and assign the doer
      const updatedAssignment = await prisma.assignment.update({
        where: { id: bid.assignmentId },
        data: {
          status: AssignmentStatus.ASSIGNED,
          doerId: bid.userId,
          acceptedBidId: bidId
        }
      });

      return { updatedBid, updatedAssignment };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Bid accepted successfully"
    });
  } catch (error: any) {
    console.error("Error accepting bid:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Failed to accept bid" 
    }, { status: 500 });
  }
} 