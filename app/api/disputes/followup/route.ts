import { addDisputeFollowUp } from '@/actions/disputes';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const authObj = await auth();
    const userId = authObj.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { disputeId, message, evidence } = body;
    
    if (!disputeId || !message) {
      return NextResponse.json(
        { error: 'Dispute ID and message are required' },
        { status: 400 }
      );
    }
    
    // Use the existing server action
    const result = await addDisputeFollowUp(disputeId, userId, message, evidence);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: true, data: result.data },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Error adding dispute follow-up:', error);
    return NextResponse.json(
      { error: 'An error occurred while adding the follow-up message' },
      { status: 500 }
    );
  }
} 