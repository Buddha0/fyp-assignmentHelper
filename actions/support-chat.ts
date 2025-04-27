"use server"

import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { pusherServer, getUserChannel, EVENT_TYPES } from "@/lib/pusher";

// Helper function to get the current user ID
async function getUserId() {
  const { userId } = await auth();
  return userId;
}

/**
 * Get or create support chat session for current user
 */
export async function getUserSupportChat() {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated"
      };
    }
    
    // Check if user has an existing active session
    let session = await prisma.supportChatSession.findFirst({
      where: {
        userId: userId,
        status: "open"
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc"
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true
              }
            }
          }
        }
      }
    });
    
    // If no active session exists, create a new one
    if (!session) {
      session = await prisma.supportChatSession.create({
        data: {
          userId: userId,
          title: "Support Chat",
          status: "open"
        },
        include: {
          messages: {
            orderBy: {
              createdAt: "asc"
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  role: true
                }
              }
            }
          }
        }
      });
    }
    
    return {
      success: true,
      data: session
    };
  } catch (error) {
    console.error("Error getting support chat:", error);
    return {
      success: false,
      error: "Failed to get support chat"
    };
  }
}

/**
 * Send a message in a support chat
 */
export async function sendSupportMessage(
  sessionId: string,
  content: string,
  fileUrls?: { url: string; name: string; type: string }[]
) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated"
      };
    }
    
    // Verify the session exists and user has access
    const session = await prisma.supportChatSession.findUnique({
      where: {
        id: sessionId
      },
      include: {
        user: {
          select: {
            id: true
          }
        }
      }
    });
    
    if (!session) {
      return {
        success: false,
        error: "Chat session not found"
      };
    }
    
    // Check if user is either the session owner or an admin
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        role: true
      }
    });
    
    const isAdmin = user?.role === "ADMIN";
    const isSessionOwner = session.userId === userId;
    
    if (!isAdmin && !isSessionOwner) {
      return {
        success: false,
        error: "You don't have permission to send messages in this chat"
      };
    }
    
    // Create the message
    const message = await prisma.supportMessage.create({
      data: {
        sessionId: sessionId,
        senderId: userId,
        content: content,
        fileUrls: fileUrls || [],
        isRead: false
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true
          }
        }
      }
    });
    
    // Update session's updatedAt
    await prisma.supportChatSession.update({
      where: {
        id: sessionId
      },
      data: {
        updatedAt: new Date()
      }
    });
    
    // Send real-time notification
    // If admin sent the message, notify the user
    // If user sent the message, notify admins
    
    if (isAdmin) {
      // Notify the user
      await pusherServer.trigger(
        getUserChannel(session.userId),
        EVENT_TYPES.NEW_SUPPORT_MESSAGE,
        {
          sessionId: sessionId,
          message: message
        }
      );
    } else {
      // Notify admins - in a real app, you would have a way to identify/target admins
      // For now, we'll use a channel pattern like 'admin-support'
      await pusherServer.trigger(
        'admin-support',
        EVENT_TYPES.NEW_SUPPORT_MESSAGE,
        {
          sessionId: sessionId,
          message: message
        }
      );
    }
    
    return {
      success: true,
      data: message
    };
  } catch (error) {
    console.error("Error sending support message:", error);
    return {
      success: false,
      error: "Failed to send message"
    };
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Attempt ${attempt + 1}/${maxRetries} failed:`, error);
      lastError = error;
      
      // Wait before retrying
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Get all active support chat sessions (for admin)
 */
export async function getAllSupportChats() {
  return withRetry(async () => {
    try {
      const userId = await getUserId();
      
      if (!userId) {
        console.error("getAllSupportChats: User not authenticated");
        return {
          success: false,
          error: "User not authenticated"
        };
      }
      
      // Verify user is an admin
      const user = await prisma.user.findUnique({
        where: {
          id: userId
        },
        select: {
          role: true
        }
      });
      
      if (user?.role !== "ADMIN") {
        console.error("getAllSupportChats: User is not an admin");
        return {
          success: false,
          error: "Only admins can view all support chats"
        };
      }
      
      console.log("getAllSupportChats: Retrieving all support chat sessions");
      
      // Get all support chat sessions
      const sessions = await prisma.supportChatSession.findMany({
        orderBy: {
          updatedAt: "desc"
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true
            }
          },
          messages: {
            orderBy: {
              createdAt: "desc"
            },
            take: 5, // Get the 5 most recent messages for preview
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  role: true
                }
              }
            }
          }
        }
      });
      
      console.log(`getAllSupportChats: Found ${sessions.length} total sessions`);
      
      if (sessions.length === 0) {
        console.log("getAllSupportChats: No support chat sessions found");
      }
      
      // Add a field for unread count
      const sessionsWithUnreadCount = await Promise.all(
        sessions.map(async (session) => {
          // Count unread messages from non-admin users
          const unreadCount = await prisma.supportMessage.count({
            where: {
              sessionId: session.id,
              senderId: {
                not: userId // Messages not sent by current admin
              },
              sender: {
                role: {
                  not: "ADMIN" // Only count messages from non-admins
                }
              },
              isRead: false
            }
          });
          
          console.log(`Session ${session.id} has ${unreadCount} unread messages`);
          
          return {
            ...session,
            unreadCount
          };
        })
      );
      
      return {
        success: true,
        data: sessionsWithUnreadCount
      };
    } catch (error) {
      console.error("Error getting support chats:", error);
      return {
        success: false,
        error: "Failed to get support chats"
      };
    }
  });
}

/**
 * Get a specific support chat session by ID (for admin)
 */
export async function getSupportChatById(sessionId: string) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated"
      };
    }
    
    // Get user role
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        role: true
      }
    });
    
    // Get the session
    const session = await prisma.supportChatSession.findUnique({
      where: {
        id: sessionId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true
          }
        },
        messages: {
          orderBy: {
            createdAt: "asc"
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true
              }
            }
          }
        }
      }
    });
    
    if (!session) {
      return {
        success: false,
        error: "Chat session not found"
      };
    }
    
    // Check permissions - only admin or session owner can view
    const isAdmin = user?.role === "ADMIN";
    const isSessionOwner = session.userId === userId;
    
    if (!isAdmin && !isSessionOwner) {
      return {
        success: false,
        error: "You don't have permission to view this chat"
      };
    }
    
    // If user is viewing their messages, mark messages as read
    if (isSessionOwner || isAdmin) {
      await prisma.supportMessage.updateMany({
        where: {
          sessionId: sessionId,
          senderId: {
            not: userId // Messages not sent by current user
          },
          isRead: false
        },
        data: {
          isRead: true
        }
      });
    }
    
    return {
      success: true,
      data: session
    };
  } catch (error) {
    console.error("Error getting support chat by ID:", error);
    return {
      success: false,
      error: "Failed to get support chat"
    };
  }
}

/**
 * Close a support chat session
 */
export async function closeSupportChat(sessionId: string) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated"
      };
    }
    
    // Get user role
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        role: true
      }
    });
    
    // Get the session
    const session = await prisma.supportChatSession.findUnique({
      where: {
        id: sessionId
      }
    });
    
    if (!session) {
      return {
        success: false,
        error: "Chat session not found"
      };
    }
    
    // Check permissions - only admin or session owner can close
    const isAdmin = user?.role === "ADMIN";
    const isSessionOwner = session.userId === userId;
    
    if (!isAdmin && !isSessionOwner) {
      return {
        success: false,
        error: "You don't have permission to close this chat"
      };
    }
    
    // Close the session
    const updatedSession = await prisma.supportChatSession.update({
      where: {
        id: sessionId
      },
      data: {
        status: "closed"
      }
    });
    
    // Add a system message indicating who closed the chat
    await prisma.supportMessage.create({
      data: {
        sessionId: sessionId,
        senderId: userId,
        content: `Chat was closed by ${isAdmin ? "admin" : "user"}`,
        isRead: true
      }
    });
    
    return {
      success: true,
      data: updatedSession
    };
  } catch (error) {
    console.error("Error closing support chat:", error);
    return {
      success: false,
      error: "Failed to close support chat"
    };
  }
}

/**
 * Mark support messages as read
 */
export async function markMessagesAsRead(messageIds: string[]) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return {
        success: false,
        error: "User not authenticated"
      };
    }
    
    if (!messageIds.length) {
      return {
        success: true,
        data: []
      };
    }
    
    // Update all messages to mark them as read
    const updatedMessages = await prisma.supportMessage.updateMany({
      where: {
        id: {
          in: messageIds
        }
      },
      data: {
        isRead: true
      }
    });
    
    return {
      success: true,
      data: updatedMessages
    };
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return {
      success: false,
      error: "Failed to mark messages as read"
    };
  }
}

/**
 * Get all unread message counts for a user
 */
export async function getUnreadSupportMessageCount() {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      console.log("getUnreadSupportMessageCount: User not authenticated");
      return {
        success: false,
        error: "User not authenticated"
      };
    }
    
    // Get user's role to determine how to count messages
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        role: true
      }
    });
    
    if (!user) {
      console.log("getUnreadSupportMessageCount: User not found");
      return {
        success: false,
        error: "User not found"
      };
    }
    
    let unreadCount = 0;
    
    if (user.role === "ADMIN") {
      // For admin, count all unread messages from users across all sessions
      console.log("getUnreadSupportMessageCount: Counting all unread messages for admin");
      
      // First, get all sessions
      const sessions = await prisma.supportChatSession.findMany({
        select: {
          id: true
        }
      });
      
      console.log(`getUnreadSupportMessageCount: Found ${sessions.length} total sessions`);
      
      // Then count unread messages in all sessions
      if (sessions.length > 0) {
        const result = await prisma.supportMessage.count({
          where: {
            sessionId: {
              in: sessions.map(session => session.id)
            },
            isRead: false,
            sender: {
              role: {
                not: "ADMIN" // Only count messages from non-admins
              }
            }
          }
        });
        unreadCount = result;
      }
      
      console.log(`getUnreadSupportMessageCount: Admin has ${unreadCount} total unread messages`);
    } else {
      // For regular users, count unread messages from admin in their chat
      console.log("getUnreadSupportMessageCount: Counting unread messages for regular user");
      
      const userSession = await prisma.supportChatSession.findFirst({
        where: {
          userId: userId,
          status: "open"
        },
        select: {
          id: true
        }
      });
      
      if (userSession) {
        const result = await prisma.supportMessage.count({
          where: {
            sessionId: userSession.id,
            isRead: false,
            sender: {
              role: "ADMIN"
            }
          }
        });
        unreadCount = result;
        console.log(`getUnreadSupportMessageCount: User has ${unreadCount} unread messages`);
      } else {
        console.log("getUnreadSupportMessageCount: No active session found for user");
      }
    }
    
    return {
      success: true,
      data: unreadCount
    };
  } catch (error) {
    console.error("Error getting unread count:", error);
    return {
      success: false,
      error: "Failed to get unread count"
    };
  }
} 