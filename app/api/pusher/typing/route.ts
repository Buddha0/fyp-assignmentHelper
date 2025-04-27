import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";
import prisma from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get body data
    const body = await req.json();
    const { assignmentId, isTyping } = body;

    if (!assignmentId) {
      return new NextResponse("Assignment ID is required", { status: 400 });
    }

    // Verify user has access to this assignment
    const assignment = await prisma.assignment.findUnique({
      where: {
        id: assignmentId,
        OR: [
          { posterId: userId },
          { doerId: userId }
        ]
      }
    });

    if (!assignment) {
      return new NextResponse("Assignment not found or access denied", { 
        status: 404 
      });
    }

    // Send typing event via Pusher
    const eventName = isTyping ? 'typing-start' : 'typing-stop';
    
    await pusherServer.trigger(
      `assignment-${assignmentId}`,
      eventName,
      { userId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TYPING_API_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 