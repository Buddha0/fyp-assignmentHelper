"use server"

import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { pusherServer } from "@/lib/pusher";
import { isAssignmentInDispute } from "./disputes";

/**
 * Get all messages for a specific assignment
 */
export async function getMessages(assignmentId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { 
        success: false, 
        error: "Unauthorized" 
      };
    }

    // Verify the user has access to this assignment
    const assignment = await prisma.assignment.findUnique({
      where: {
        id: assignmentId,
        OR: [
          { posterId: userId },
          { doerId: userId }
        ]
      },
      select: {
        id: true,
        posterId: true,
        doerId: true
      }
    });

    if (!assignment) {
      return { 
        success: false, 
        error: "Assignment not found or access denied" 
      };
    }

    // Get only direct messages between poster and doer for this assignment
    const messages = await prisma.message.findMany({
      where: {
        assignmentId: assignmentId,
        AND: [
          // Make sure senderId is either poster or doer
          {
            senderId: {
              in: [assignment.posterId, assignment.doerId].filter(Boolean) as string[]
            }
          },
          // Make sure receiverId is either poster or doer
          {
            receiverId: {
              in: [assignment.posterId, assignment.doerId].filter(Boolean) as string[]
            }
          },
          // Filter out system notification messages
          {
            NOT: {
              content: {
                contains: "bid received",
                mode: "insensitive"
              }
            }
          },
          {
            NOT: {
              content: {
                contains: "accepted the bid",
                mode: "insensitive"
              }
            }
          },
          {
            NOT: {
              content: {
                contains: "dispute raised",
                mode: "insensitive"
              }
            }
          },
          {
            NOT: {
              content: {
                contains: "completed the task",
                mode: "insensitive"
              }
            }
          },
          {
            NOT: {
              content: {
                contains: "submitted",
                mode: "insensitive"
              }
            }
          }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    // Mark messages as read if they were sent to the current user
    await prisma.message.updateMany({
      where: {
        assignmentId: assignmentId,
        receiverId: userId,
        isRead: false,
        // Ensure we're only marking direct messages as read
        senderId: {
          in: [assignment.posterId, assignment.doerId].filter(Boolean) as string[]
        }
      },
      data: {
        isRead: true
      }
    });

    return { 
      success: true, 
      data: messages 
    };
  } catch (error) {
    console.error("Failed to get messages:", error);
    return { 
      success: false, 
      error: "Failed to load messages" 
    };
  }
}

/**
 * Send a new message
 */
export async function sendMessage(
  content: string,
  assignmentId: string,
  receiverId: string,
  fileUrl?: string,
  fileName?: string,
  fileType?: string
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { 
        success: false, 
        error: "Unauthorized" 
      };
    }

    // Verify the user has access to this assignment
    const assignment = await prisma.assignment.findUnique({
      where: {
        id: assignmentId,
        OR: [
          { posterId: userId },
          { doerId: userId }
        ]
      },
      select: {
        posterId: true,
        doerId: true,
        status: true
      }
    });

    if (!assignment) {
      return { 
        success: false, 
        error: "Assignment not found or access denied" 
      };
    }

    // Check if the assignment has a doer assigned (bid accepted)
    if (!assignment.doerId) {
      return {
        success: false,
        error: "Chat is only available after a bid has been accepted"
      };
    }

    // Check if the assignment is in dispute
    const disputeStatus = await isAssignmentInDispute(assignmentId);
    if (disputeStatus.success && disputeStatus.inDispute) {
      return {
        success: false,
        error: "Messaging is restricted while this task is in dispute"
      };
    }

    // Check if the assignment is completed or finalized
    if (assignment.status === "COMPLETED") {
      return {
        success: false,
        error: "Messaging is not available for completed tasks"
      };
    }

    // Check if the assignment had a dispute that was resolved (payment released or refunded)
    const payment = await prisma.payment.findFirst({
      where: {
        assignmentId: assignmentId,
        status: {
          in: ["RELEASED", "REFUNDED"]
        }
      }
    });

    if (payment) {
      return {
        success: false,
        error: "This task has been finalized and messaging is no longer available"
      };
    }

    // Ensure receiver is part of this assignment
    if (receiverId !== assignment.posterId && receiverId !== assignment.doerId) {
      return { 
        success: false, 
        error: "Invalid recipient" 
      };
    }
    
    // Prepare file data if provided
    let fileData = {};
    
    if (fileUrl) {
      // Check if it's already valid JSON
      try {
        // If it's already a JSON string, keep it as is
        JSON.parse(fileUrl);
        fileData = { fileUrls: fileUrl };
      } catch (e) {
        // Not valid JSON, create a new structure
        fileData = {
          fileUrls: JSON.stringify([{ 
            url: fileUrl,
            name: fileName || fileUrl.split('/').pop() || "Attachment",
            type: fileType || "application/octet-stream"
          }])
        };
      }
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content,
        assignmentId,
        senderId: userId,
        receiverId,
        ...fileData
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    // Trigger Pusher event
    await pusherServer.trigger(
      `assignment-${assignmentId}`,
      'new-message',
      message
    );

    // Revalidate paths to update UI
    revalidatePath(`/poster/${assignmentId}`);
    revalidatePath(`/doer/tasks/${assignmentId}`);
    revalidatePath(`/poster/${assignmentId}/chat`);
    revalidatePath(`/doer/tasks/${assignmentId}/chat`);

    return { 
      success: true, 
      data: message 
    };
  } catch (error) {
    console.error("Send message error:", error);
    return { 
      success: false, 
      error: "Failed to send message" 
    };
  }
}

/**
 * Get unread message count for the current user
 */
export async function getUnreadMessageCount() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { 
        success: false, 
        error: "Unauthorized" 
      };
    }

    const count = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false
      }
    });

    return { 
      success: true, 
      data: count 
    };
  } catch (error) {
    console.error("Get unread count error:", error);
    return { 
      success: false, 
      error: "Failed to get unread count" 
    };
  }
}

/**
 * Get unread message count for a specific assignment
 */
export async function getAssignmentUnreadCount(assignmentId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { 
        success: false, 
        error: "Unauthorized" 
      };
    }

    const count = await prisma.message.count({
      where: {
        assignmentId: assignmentId,
        receiverId: userId,
        isRead: false
      }
    });

    return { 
      success: true, 
      data: count 
    };
  } catch (error) {
    console.error("Get assignment unread count error:", error);
    return { 
      success: false, 
      error: "Failed to get unread count" 
    };
  }
} 