import prisma from '@/lib/db';
import { pusherServer } from '@/lib/pusher';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const { messageIds } = await req.json();
    
    if (!messageIds || !Array.isArray(messageIds)) {
      return new NextResponse('Invalid request body', { status: 400 });
    }
    
    // Update messages
    await prisma.message.updateMany({
      where: {
        id: {
          in: messageIds
        },
        receiverId: userId, // Only mark messages where the current user is the receiver
        isRead: false // Only update unread messages
      },
      data: {
        isRead: true
      }
    });
    
    // Trigger real-time update through Pusher
    // This will update the read status for the sender in real-time
    const messages = await prisma.message.findMany({
      where: {
        id: {
          in: messageIds
        }
      },
      select: {
        id: true,
        assignmentId: true,
        senderId: true
      }
    });
    
    // Group messages by assignment to trigger updates
    const assignmentGroups = messages.reduce((acc, msg) => {
      if (msg.assignmentId) {
        if (!acc[msg.assignmentId]) {
          acc[msg.assignmentId] = new Set();
        }
        acc[msg.assignmentId].add(msg.id);
      }
      return acc;
    }, {} as Record<string, Set<string>>);
    
    // Trigger updates for each assignment
    for (const [assignmentId, msgIds] of Object.entries(assignmentGroups)) {
      await pusherServer.trigger(
        `assignment-${assignmentId}`,
        'messages-read',
        {
          messageIds: Array.from(msgIds),
          readBy: userId,
          timestamp: new Date().toISOString()
        }
      );
    }
    
    return new NextResponse('Messages marked as read', { status: 200 });
  } catch (error) {
    console.error('[MESSAGES_MARK_READ]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
} 