import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

// eSewa Sandbox credentials
const MERCHANT_CODE = 'EPAYTEST';
const SECRET_KEY = '8gBm/:&EnhH.1/q';

export async function POST(req: NextRequest) {
  try {
    console.log('Payment initiation started');
    
    // Verify user is authenticated
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      console.log('Unauthorized request - no userId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Authenticated user:', userId);

    // Parse request body
    const body = await req.json();
    const { bidId, taskId } = body;
    
    console.log('Request body:', { bidId, taskId });

    if (!bidId || !taskId) {
      console.log('Missing required fields:', { bidId, taskId });
      return NextResponse.json(
        { error: 'Missing required fields: bidId and taskId' },
        { status: 400 }
      );
    }

    // Fetch the task and bid details to verify
    console.log('Fetching task and bid details...');
    const task = await prisma.assignment.findUnique({
      where: { id: taskId },
      include: {
        poster: true,
        payment: true, // Include existing payment if any
      }
    });

    if (!task) {
      console.log('Task not found:', taskId);
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    console.log('Task found:', task.id, 'Status:', task.status);

    // Verify the authenticated user is the task poster
    if (task.posterId !== userId) {
      console.log('Permission denied. Task poster:', task.posterId, 'Current user:', userId);
      return NextResponse.json(
        { error: 'You do not have permission to make payment for this task' },
        { status: 403 }
      );
    }
    
    // Fetch the specific bid directly
    console.log('Fetching bid with ID:', bidId);
    const selectedBid = await prisma.bid.findUnique({
      where: { 
        id: bidId,
        assignmentId: taskId
      },
      include: { user: true }
    });

    if (!selectedBid) {
      console.log('Bid not found for ID:', bidId);
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    }

    console.log('Selected bid found:', selectedBid.id, 'Amount:', selectedBid.bidAmount);

    // Determine the payment amount from the bid
    const amount = selectedBid.bidAmount;
    
    // Generate a unique transaction UUID
    const transactionUuid = uuidv4();
    console.log('Generated transaction UUID:', transactionUuid);
    
    // Create payment signature as per eSewa docs
    const signatureString = `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${MERCHANT_CODE}`;
    const signature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(signatureString)
      .digest('base64');
    
    console.log('Signature created');
    
    // Check if NEXT_PUBLIC_APP_URL is available
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    console.log('Using app URL:', appUrl);
    
    // Check if payment already exists for this assignment
    let payment;
    
    console.log('Creating/updating payment record...');
    try {
      if (task.payment) {
        console.log('Payment already exists for this task, updating record...');
        payment = await prisma.payment.update({
          where: { id: task.payment.id },
          data: {
            amount, // Update with new bid amount
            status: 'PENDING',
            esewaTransactionUuid: transactionUuid,
            receiverId: selectedBid.userId, // Update receiver to selected bid user
          }
        });
        console.log('Payment record updated:', payment.id);
      } else {
        console.log('Creating new payment record...');
        payment = await prisma.payment.create({
          data: {
            amount,
            status: 'PENDING',
            esewaTransactionUuid: transactionUuid,
            assignmentId: task.id,
            senderId: task.posterId,
            receiverId: selectedBid.userId,
          }
        });
        console.log('Payment record created:', payment.id);
      }

      // Prepare the form data for eSewa
      const formData = {
        amount,
        tax_amount: 0,
        total_amount: amount,
        transaction_uuid: transactionUuid,
        product_code: MERCHANT_CODE,
        product_service_charge: 0,
        product_delivery_charge: 0,
        success_url: `${appUrl}/api/payments/success`,
        failure_url: `${appUrl}/api/payments/failure`,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature,
      };

      console.log('Form data prepared, returning success response');
      return NextResponse.json({
        success: true,
        data: {
          paymentId: payment.id,
          formData,
          paymentUrl: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
        }
      });
    } catch (dbError) {
      console.error('Database error when creating/updating payment:', dbError);
      return NextResponse.json(
        { error: 'Failed to create payment record in database: ' + (dbError instanceof Error ? dbError.message : 'Unknown error') },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error initiating payment:', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 