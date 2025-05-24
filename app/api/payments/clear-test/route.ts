import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
        
    // Verify user is authenticated
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    // Parse request body
    const body = await req.json();
    const { taskId } = body;
    
    
    if (!taskId) {
            return NextResponse.json(
        { error: 'Missing required field: taskId' },
        { status: 400 }
      );
    }

    // Fetch the task to verify it exists and belongs to the current user
        const task = await prisma.assignment.findUnique({
      where: { id: taskId },
      include: {
        payment: true,
      }
    });

    if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    
    // Verify the authenticated user is the task poster or an admin
    if (task.posterId !== userId) {
            return NextResponse.json(
        { error: 'You do not have permission to clear payment for this task' },
        { status: 403 }
      );
    }

    // Check if payment exists
    if (!task.payment) {
            return NextResponse.json({ 
        success: true, 
        message: 'No payment record found for this task' 
      });
    }

    
    // Delete the payment record
    try {
      await prisma.payment.delete({
        where: { id: task.payment.id }
      });
      
            
      return NextResponse.json({
        success: true,
        message: 'Payment record deleted successfully'
      });
    } catch (dbError) {
      console.error('Database error when deleting payment:', dbError);
      return NextResponse.json(
        { error: 'Failed to delete payment record: ' + (dbError instanceof Error ? dbError.message : 'Unknown error') },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error clearing payment:', error);
    return NextResponse.json(
      { error: 'Failed to clear payment: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 