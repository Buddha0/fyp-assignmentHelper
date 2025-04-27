"use server"

import prisma from "@/lib/db"
import { auth } from "@clerk/nextjs/server"
import { AssignmentStatus } from "@prisma/client"

// Get dashboard stats for a poster
export async function getPosterStats() {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error("Unauthorized")
  }

  const activeTasks = await prisma.assignment.count({
    where: {
      posterId: userId,
      status: {
        in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
      }
    }
  })

  const completedTasks = await prisma.assignment.count({
    where: {
      posterId: userId,
      status: AssignmentStatus.COMPLETED
    }
  })

  const pendingReviews = await prisma.assignment.count({
    where: {
      posterId: userId,
      status: AssignmentStatus.UNDER_REVIEW
    }
  })

  const unreadMessages = await prisma.message.count({
    where: {
      receiverId: userId,
      isRead: false
    }
  })

  return {
    activeTasks,
    completedTasks,
    pendingReviews,
    unreadMessages
  }
}

// Get recent tasks for a poster
export async function getPosterTasks(limit = 6) {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error("Unauthorized")
  }

  const tasks = await prisma.assignment.findMany({
    where: {
      posterId: userId
    },
    orderBy: {
      updatedAt: 'desc'
    },
    take: limit,
    include: {
      doer: {
        select: {
          name: true
        }
      },
      bids: {
        select: {
          id: true
        }
      },
      messages: {
        select: {
          id: true
        }
      },
      submissions: {
        where: {
          status: "pending"
        },
        select: {
          id: true
        }
      }
    }
  })

  return tasks.map(task => {
    // Calculate progress based on status
    let progress = 0
    switch (task.status) {
      case AssignmentStatus.OPEN:
        progress = 0
        break
      case AssignmentStatus.ASSIGNED:
        progress = 25
        break
      case AssignmentStatus.IN_PROGRESS:
        progress = 50
        break
      case AssignmentStatus.UNDER_REVIEW:
        progress = 85
        break
      case AssignmentStatus.COMPLETED:
        progress = 100
        break
      default:
        progress = 0
    }

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      budget: task.budget,
      deadline: task.deadline.toISOString().split('T')[0],
      status: mapStatusToUI(task.status),
      progress,
      doerName: task.doer?.name || "",
      bidsCount: task.bids.length,
      messagesCount: task.messages.length,
      hasPendingSubmission: task.submissions.length > 0
    }
  })
}

// Get recent bids for a poster's tasks
export async function getPosterBids(limit = 3) {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error("Unauthorized")
  }

  const bids = await prisma.bid.findMany({
    where: {
      assignment: {
        posterId: userId,
        status: AssignmentStatus.OPEN
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    include: {
      user: {
        select: {
          name: true
        }
      },
      assignment: {
        select: {
          title: true
        }
      }
    }
  })

  return bids.map(bid => ({
    id: bid.id,
    doerName: bid.user.name || "Anonymous User",
    taskTitle: bid.assignment.title,
    amount: bid.bidAmount,
    createdAt: bid.createdAt
  }))
}

// Get recent task activities
export async function getTaskActivities(limit = 3) {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error("Unauthorized")
  }

  // Get recent status changes
  const recentAssignments = await prisma.assignment.findMany({
    where: {
      posterId: userId,
      OR: [
        { status: AssignmentStatus.COMPLETED },
        { status: AssignmentStatus.IN_PROGRESS },
        { status: AssignmentStatus.UNDER_REVIEW }
      ]
    },
    orderBy: {
      updatedAt: 'desc'
    },
    take: limit,
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      doer: {
        select: {
          name: true
        }
      }
    }
  })

  // Get recent messages
  const recentMessages = await prisma.message.findMany({
    where: {
      receiverId: userId
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      sender: {
        select: {
          name: true
        }
      },
      assignment: {
        select: {
          title: true
        }
      }
    }
  })

  // Combine and sort activities
  const activities = [
    ...recentAssignments.map(assignment => ({
      type: 'status',
      title: getActivityTitle(assignment.status),
      description: assignment.title,
      actorName: assignment.doer?.name || "",
      timestamp: assignment.updatedAt
    })),
    ...recentMessages.map(message => ({
      type: 'message',
      title: 'New message',
      description: message.assignment?.title || "Direct message",
      actorName: message.sender.name || "Anonymous User",
      timestamp: message.createdAt
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit)

  return activities
}

// Helper function to map DB status to UI status
function mapStatusToUI(status: AssignmentStatus) {
  switch (status) {
    case AssignmentStatus.OPEN:
      return "open"
    case AssignmentStatus.ASSIGNED:
      return "assigned"
    case AssignmentStatus.IN_PROGRESS:
      return "in-progress"
    case AssignmentStatus.UNDER_REVIEW:
      return "pending-review"
    case AssignmentStatus.COMPLETED:
      return "completed"
    case AssignmentStatus.CANCELLED:
      return "cancelled"
    default:
      return "open"
  }
}

// Helper function to get activity title based on status
function getActivityTitle(status: AssignmentStatus) {
  switch (status) {
    case AssignmentStatus.IN_PROGRESS:
      return "Task progress updated"
    case AssignmentStatus.UNDER_REVIEW:
      return "Task submitted for review"
    case AssignmentStatus.COMPLETED:
      return "Task completed"
    default:
      return "Status updated"
  }
} 