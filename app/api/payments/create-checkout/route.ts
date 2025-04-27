import prisma from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.error('Unauthorized checkout attempt - no user ID');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    console.log('Checkout request body:', body);

    const { taskId, bidId } = body;

    if (!taskId || !bidId) {
      console.error('Missing required fields in checkout request:', { taskId, bidId });
      return NextResponse.json(
        { error: 'Task ID and Bid ID are required' },
        { status: 400 }
      );
    }

    // Get the bid and task details
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: {
        assignment: true,
        user: true,
      },
    });

    if (!bid) {
      console.error('Bid not found:', bidId);
      return NextResponse.json(
        { error: 'Bid not found' },
        { status: 404 }
      );
    }

    // Verify the user is the task poster
    if (bid.assignment.posterId !== userId) {
      console.error('Unauthorized checkout attempt - user is not the poster:',
        { userId, posterId: bid.assignment.posterId });
      return NextResponse.json(
        { error: 'Only the task poster can process payment' },
        { status: 403 }
      );
    }

    // Verify the task is still in OPEN status
    if (bid.assignment.status !== 'OPEN') {
      console.error('Cannot accept bid - task is not open:',
        { taskId, currentStatus: bid.assignment.status });
      return NextResponse.json(
        { error: 'This task is no longer available for payment' },
        { status: 400 }
      );
    }

    // Check if a payment already exists for this task
    const existingPayment = await prisma.payment.findUnique({
      where: { assignmentId: taskId },
    });

    if (existingPayment) {
      console.error('Payment already exists for this task:',
        { taskId, paymentId: existingPayment.id, status: existingPayment.status });
      return NextResponse.json(
        { error: 'Payment already exists for this task' },
        { status: 400 }
      );
    }

    // TODO: Integrate eSewa payment session creation here
    const payment = await prisma.payment.create({
      data: {
        amount: bid.bidAmount,
        status: 'PENDING',
        assignmentId: taskId,
        senderId: userId,
        receiverId: bid.userId,
      },
    });
    console.log('Payment record created', { paymentId: payment.id });

    return NextResponse.json({ success: true, paymentId: payment.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}