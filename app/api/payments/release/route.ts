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
    const { taskId, paymentId } = body;

    if (!taskId || !paymentId) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId and paymentId' },
        { status: 400 }
      );
    }

    // Get the task details
    const task = await prisma.assignment.findUnique({
      where: { id: taskId },
      include: {
        payment: true
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify the authenticated user is either the task poster or an admin
    // In a real implementation, you would check for admin role
    if (task.posterId !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to release this payment' },
        { status: 403 }
      );
    }

    // Verify payment exists and matches the task
    if (!task.payment || task.payment.id !== paymentId) {
      return NextResponse.json(
        { error: 'Payment not found for this task' },
        { status: 404 }
      );
    }

    // Check payment status - only release if in PENDING state
    if (task.payment.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Payment cannot be released from ${task.payment.status} state` },
        { status: 400 }
      );
    }

    // Get doer ID from task
    if (!task.doerId) {
      return NextResponse.json(
        { error: 'No doer assigned to this task' },
        { status: 400 }
      );
    }

    // Perform transaction to update payment, task, and doer's account balance
    const [updatedPayment, updatedTask, updatedDoer] = await prisma.$transaction([
      // Update payment status to RELEASED
      prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'RELEASED' }
      }),
      
      // Update task status to COMPLETED
      prisma.assignment.update({
        where: { id: taskId },
        data: { status: 'COMPLETED' }
      }),
      
      // Update doer's account balance
      prisma.user.update({
        where: { id: task.doerId },
        data: {
          accountBalance: {
            increment: task.payment.amount
          }
        }
      })
    ]);

    // In a production system:
    // 1. You would initiate actual funds transfer to the doer here
    // 2. Update the doer's balance in your platform
    // 3. Generate payment receipts/invoices
    
    // For demo/academic purposes, we'll just log this
    console.log(`Payment ${paymentId} released for task ${taskId}. Amount: ${task.payment.amount} credited to doer: ${task.doerId}`);

    return NextResponse.json({
      success: true,
      message: 'Payment released successfully',
      data: {
        payment: updatedPayment,
        task: updatedTask,
        doer: {
          id: updatedDoer.id,
          accountBalance: updatedDoer.accountBalance
        }
      }
    });
    
  } catch (error) {
    console.error('Error releasing payment:', error);
    return NextResponse.json(
      { error: 'Failed to release payment' },
      { status: 500 }
    );
  }
} 