"use server";

import prisma from "@/lib/db";

export async function getUserStats(userId: string) {
  try {
    // Get active tasks count
    const activeTasks = await prisma.assignment.count({
      where: {
        doerId: userId,
        status: {
          in: ['ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW']
        }
      }
    })
    
    // Get completed tasks count
    const completedTasks = await prisma.assignment.count({
      where: {
        doerId: userId,
        status: 'COMPLETED'
      }
    })
    
    // Calculate success rate (completed tasks / total assigned tasks)
    const totalAssignedTasks = await prisma.assignment.count({
      where: {
        doerId: userId,
        status: {
          in: ['ASSIGNED', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED']
        }
      }
    })
    
    const successRate = totalAssignedTasks > 0 
      ? Math.round((completedTasks / totalAssignedTasks) * 100) 
      : 100
    
    // Get unread messages count
    const unreadMessages = await prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false
      }
    })
    
    return {
      activeTasks,
      completedTasks,
      successRate,
      unreadMessages
    }
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return {
      activeTasks: 0,
      completedTasks: 0,
      successRate: 0,
      unreadMessages: 0
    }
  }
} 