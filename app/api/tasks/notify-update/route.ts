import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';
import { getTaskChannel, EVENT_TYPES } from '@/lib/pusher';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    // Check authentication
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await req.json();
    const { taskId, update } = body;
    
    if (!taskId || !update) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check if task exists
    const task = await prisma.assignment.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        status: true,
        posterId: true,
        doerId: true
      }
    });
    
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Check if user has permission to update this task
    if (task.posterId !== userId && task.doerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }
    
    // Trigger Pusher event on the task channel
    const taskChannel = getTaskChannel(taskId);
    await pusherServer.trigger(taskChannel, EVENT_TYPES.TASK_UPDATED, {
      task: {
        id: taskId,
        ...update
      }
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Task update notification sent'
    });
    
  } catch (error) {
    console.error('Error in task notification endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 