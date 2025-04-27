"use server"

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { submitDisputeResponse } from "@/actions/disputes";

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
    const { disputeId, response, evidence } = body;

    // Validate the request
    if (!disputeId || !response) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Submit the dispute response
    const result = await submitDisputeResponse(disputeId, userId, response, evidence);

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error responding to dispute:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 