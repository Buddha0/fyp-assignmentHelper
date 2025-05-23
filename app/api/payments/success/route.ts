import { createNotification } from '@/actions/notifications';
import prisma from '@/lib/db';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// eSewa Sandbox credentials

const SECRET_KEY = '8gBm/:&EnhH.1/q';

export async function GET(req: NextRequest) {
  try {
        
    // Get the data parameter from URL
    const url = new URL(req.url);
    const data = url.searchParams.get('data');
    
        
    if (!data) {
      console.error('Missing data parameter in success callback');
      return NextResponse.json({ error: 'Missing data parameter' }, { status: 400 });
    }
    
    // Decode the base64 data
    let decodedData;
    let responseData;
    
    try {
      decodedData = Buffer.from(data, 'base64').toString();
      responseData = JSON.parse(decodedData);
          } catch (decodeError) {
      console.error('Error decoding data:', decodeError);
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }
    
    const {
      transaction_uuid,
      status,
      // transaction_code,
      reference_id,
      signed_field_names,
      signature
    } = responseData;

        
    // Validate the signature
    if (signed_field_names && signature) {
            const fields = signed_field_names.split(',');
      const signatureString = fields
        .map(field => `${field}=${responseData[field]}`)
        .join(',');
      
      const expectedSignature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(signatureString)
        .digest('base64');
      
      if (signature !== expectedSignature) {
        console.error('Invalid signature. Expected:', expectedSignature, 'Received:', signature);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
      
          } else {
      console.warn('No signature to validate in response');
    }
    
    // Find the payment record
        const payment = await prisma.payment.findFirst({
      where: {
        esewaTransactionUuid: transaction_uuid
      },
      include: {
        assignment: true,
        sender: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!payment) {
      console.error('Payment not found for transaction:', transaction_uuid);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    
        
    // Verify payment status
    if (status !== 'COMPLETE') {
      console.error('Payment not completed, status:', status);
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }
    
        
    // Update payment status and store verification data
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PENDING', // Payment received but held in escrow
        esewaRefId: reference_id,
        esewaVerificationJson: responseData
      }
    });
    
        
    // Update the assignment status to ASSIGNED
    await prisma.assignment.update({
      where: { id: payment.assignmentId },
      data: { 
        status: 'ASSIGNED',
        // Find and accept the bid associated with this payment
        doerId: payment.receiverId 
      }
    });
    
        
    // Find the accepted bid
    const acceptedBid = await prisma.bid.findFirst({
      where: { 
        assignmentId: payment.assignmentId,
        userId: payment.receiverId
      },
      include: {
        assignment: {
          select: {
            title: true
          }
        }
      }
    });
    
    // Update the bid status to accepted
    if (acceptedBid) {
      await prisma.bid.update({
        where: { id: acceptedBid.id },
        data: { status: 'accepted' }
      });
      
          }
    
    // Send notification to the doer that their bid was accepted
    try {
      if (payment.receiverId) {
                
        const notificationResult = await createNotification({
          userId: payment.receiverId,
          title: "Bid Accepted!",
          message: `${payment.sender?.name || 'Client'} has accepted your bid on task: ${payment.assignment.title}`,
          type: "bid_accepted",
          link: `/doer/tasks/${payment.assignmentId}`
        });
        
        if (notificationResult.success) {
                  } else {
          console.error("Failed to create notification:", notificationResult.error);
        }
      }
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError);
      // We don't want to fail the bid acceptance if notification fails
      // So we just log the error and continue
    }
    
    // Reject all other bids
    await prisma.bid.updateMany({
      where: { 
        assignmentId: payment.assignmentId,
        userId: { not: payment.receiverId }
      },
      data: { status: 'rejected' }
    });
    
        
    // Send notifications to rejected bidders
    try {
      const rejectedBids = await prisma.bid.findMany({
        where: { 
          assignmentId: payment.assignmentId,
          userId: { not: payment.receiverId },
          status: 'rejected'
        },
        select: {
          id: true,
          userId: true
        }
      });
      
      for (const rejectedBid of rejectedBids) {
        // Create a notification for each rejected bidder
        try {
          await createNotification({
            userId: rejectedBid.userId,
            title: "Bid Not Selected",
            message: `Your bid on task: "${payment.assignment.title}" was not selected by the client.`,
            type: "bid_rejected",
            link: `/doer/bids`
          });
        } catch (notificationError) {
          console.error("Error creating rejection notification:", notificationError);
          // Continue with next notification even if this one fails
        }
      }
    } catch (error) {
      console.error("Error notifying rejected bidders:", error);
    }
    
    // Get the app URL for redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ;
    
    // Redirect to a success page
    const redirectUrl = `${appUrl}/poster/tasks/${payment.assignmentId}?payment=success`;
        
    return NextResponse.redirect(redirectUrl);
    
  } catch (error) {
    console.error('Error processing payment success:', error);
    
    // Get the app URL for redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    // Redirect to a general error page
    return NextResponse.redirect(`${appUrl}/payment-error?reason=${encodeURIComponent('An error occurred while processing payment')}`);
  }
} 