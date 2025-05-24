"use server";

import prisma from "@/lib/db";
import { AssignmentStatus } from "@prisma/client";

/**
 * Get active tasks for a doer
 */
export async function getActiveTasks(userId: string) {
  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        doerId: userId,
        status: {
          in: ['ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW', 'IN_DISPUTE']
        }
      },
      include: {
        poster: {
          select: {
            name: true,
            image: true
          }
        },
        submissions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Transform data for the frontend
    return assignments.map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      budget: assignment.budget,
      deadline: assignment.deadline,
      status: transformStatus(assignment.status),
      category: assignment.category,
      poster: assignment.poster,
      hasSubmissions: assignment.submissions.length > 0,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt
    }))
  } catch (error) {
    console.error('Error fetching active tasks:', error)
    return null
  }
}

/**
 * Get available tasks for doers to bid on
 */
export async function getAvailableTasks() {
  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        status: 'OPEN'
      },
      include: {
        poster: {
          select: {
            name: true,
            image: true
          }
        },
        bids: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // Transform data for the frontend
    return assignments.map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      description: truncateDescription(assignment.description),
      budget: assignment.budget,
      deadline: assignment.deadline,
      category: assignment.category,
      poster: assignment.poster,
      bidCount: assignment.bids.length
    }))
  } catch (error) {
    console.error('Error fetching available tasks:', error)
    return null
  }
}

/**
 * Get recent bids placed by a doer
 */
export async function getRecentBids(userId: string) {
  try {
    const bids = await prisma.bid.findMany({
      where: {
        userId: userId
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            budget: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    // Transform data for the frontend
    return bids.map(bid => ({
      id: bid.id,
      taskId: bid.assignment.id,
      taskTitle: bid.assignment.title,
      bidAmount: bid.bidAmount,
      taskBudget: bid.assignment.budget,
      status: bid.status,
      taskStatus: transformStatus(bid.assignment.status),
      createdAt: bid.createdAt
    }))
  } catch (error) {
    console.error('Error fetching recent bids:', error)
    return null
  }
}

/**
 * Get activity summary for the doer dashboard
 */
export async function getUserActivitySummary(userId: string) {
  try {
    // Get most recent unread messages
    const recentMessages = await prisma.message.findMany({
      where: {
        receiverId: userId,
        isRead: false
      },
      include: {
        sender: {
          select: {
            name: true,
            image: true
          }
        },
        assignment: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    })

    // Get task status updates
    const recentTaskUpdates = await prisma.assignment.findMany({
      where: {
        doerId: userId,
        status: {
          not: 'COMPLETED'
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 3
    })

    // Get most recent bid
    const recentBid = await prisma.bid.findFirst({
      where: {
        userId: userId
      },
      include: {
        assignment: {
          select: {
            title: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform data for the frontend
    return {
      recentMessages: recentMessages.map(message => ({
        id: message.id,
        content: message.content,
        sender: message.sender,
        taskTitle: message.assignment?.title || 'Unknown Task',
        createdAt: message.createdAt
      })),
      recentTaskUpdates: recentTaskUpdates.map(task => ({
        id: task.id,
        title: task.title,
        status: transformStatus(task.status),
        updatedAt: task.updatedAt
      })),
      recentBid: recentBid ? {
        id: recentBid.id,
        taskTitle: recentBid.assignment.title,
        status: recentBid.status,
        taskStatus: transformStatus(recentBid.assignment.status),
        createdAt: recentBid.createdAt
      } : null
    }
  } catch (error) {
    console.error('Error fetching user activity summary:', error)
    return null
  }
}

/**
 * Helper function to transform DB status to UI-friendly format
 */
function transformStatus(status: AssignmentStatus | string): string {
  switch (status) {
    case 'OPEN':
      return 'open'
    case 'ASSIGNED':
      return 'assigned'
    case 'IN_PROGRESS':
      return 'in-progress'
    case 'UNDER_REVIEW':
      return 'pending-review'
    case 'COMPLETED':
      return 'completed'
    case 'CANCELLED':
      return 'cancelled'
    case 'IN_DISPUTE':
      return 'in-dispute'
    default:
      return status.toLowerCase()
  }
}

/**
 * Helper function to truncate long task descriptions
 */
function truncateDescription(description: string): string {
  if (description.length > 120) {
    return description.substring(0, 120) + '...'
  }
  return description
}

// Add a new direct function to fetch task by ID without any filtering
export async function getTaskById(taskId: string) {
    try {
                
        if (!taskId) {
            return {
                success: false,
                error: "Task ID is required"
            };
        }
        
        // Simple direct lookup
        const task = await prisma.assignment.findUnique({
            where: {
                id: taskId
            },
            include: {
                poster: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        rating: true,
                        createdAt: true
                    }
                }
            }
        });
        
        if (!task) {
            return {
                success: false,
                error: "Task not found"
            };
        }
        
        return {
            success: true,
            data: task
        };
    } catch (error) {
        console.error("Error in direct task lookup:", error);
        return {
            success: false,
            error: "Failed to fetch task details"
        };
    }
}

// Debug function that verifies the task ID by doing a direct lookup
export async function debugTaskId(taskId: string) {
               
    
    try {
        // Run a raw SQL query to see if we can match by ID
        const rawResults = await prisma.$queryRaw`
            SELECT id, title 
            FROM "Assignment" 
            WHERE id = ${taskId}
        `;
        
                
        // Also check the standard Prisma query
        const task = await prisma.assignment.findUnique({
            where: {
                id: taskId
            },
            select: {
                id: true,
                title: true
            }
        });
        
                
        return {
            success: !!task,
            data: {
                rawResults,
                prismaTask: task
            }
        };
    } catch (error) {
        console.error("Error debugging task ID:", error);
        return {
            success: false,
            error: "Error querying database"
        };
    }
}

// Fetch a task by ID directly without any access control - for debugging and fixing the task not found issue
export async function fetchTaskDirectly(taskId: string) {
    try {
                
        if (!taskId) {
            return {
                success: false,
                error: "Task ID is required"
            };
        }
        
        // Simple direct lookup with full details
        const task = await prisma.assignment.findUnique({
            where: {
                id: taskId
            },
            include: {
                poster: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        rating: true,
                        createdAt: true
                    }
                },
                doer: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        rating: true
                    }
                },
                bids: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                submissions: true,
                messages: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                name: true,
                                image: true
                            }
                        }
                    }
                }
            }
        });
        
        if (!task) {
            return {
                success: false,
                error: "Task not found in database"
            };
        }
        
        // Create a complete response with all possible fields
        const taskData = {
            ...task,
            status: task.status.toLowerCase(),
            poster: {
                id: task.poster?.id || "",
                name: task.poster?.name || "Client",
                image: task.poster?.image || null,
                rating: task.poster?.rating || 0,
                memberSince: task.poster?.createdAt || new Date()
            },
            messages: task.messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                createdAt: msg.createdAt,
                sender: {
                    id: msg.sender.id,
                    name: msg.sender.name || "User",
                    image: msg.sender.image
                }
            })),
            submissions: task.submissions.map(sub => ({
                id: sub.id,
                content: sub.content,
                status: sub.status,
                createdAt: sub.createdAt,
                attachments: sub.attachments
            })),
            bid: task.bids.length > 0 ? {
                id: task.bids[0].id,
                amount: task.bids[0].bidAmount,
                timeframe: "Not specified",
                message: task.bids[0].content,
                status: task.bids[0].status
            } : null
        };
        
                
        return {
            success: true,
            data: taskData
        };
    } catch (error) {
        console.error("Error in direct task fetch:", error);
        return {
            success: false,
            error: "Failed to fetch task details: " + (error instanceof Error ? error.message : String(error))
        };
    }
}