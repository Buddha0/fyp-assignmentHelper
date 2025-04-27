import { NextRequest, NextResponse } from "next/server";
import { createDispute } from "@/actions/disputes";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await auth();
    const userId = authResult.userId;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { assignmentId, initiatorId, reason, evidence } = body;

    // Validate the request
    if (!assignmentId || !initiatorId || !reason) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure the user can only create disputes for themselves
    if (userId !== initiatorId) {
      return NextResponse.json(
        { success: false, error: "You can only create disputes for yourself" },
        { status: 403 }
      );
    }

    // Create the dispute
    const result = await createDispute(assignmentId, initiatorId, reason, evidence);

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error creating dispute:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 