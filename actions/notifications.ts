"use server"

import prisma from "@/lib/db";
import { pusherServer, getUserChannel, EVENT_TYPES } from "@/lib/pusher";
import { auth } from "@clerk/nextjs/server";

// Create a new notification
export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        isRead: false,
        link: data.link,
        type: data.type,
        createdAt: new Date()
      }
    });

    // Send real-time notification through Pusher
    await pusherServer.trigger(
      getUserChannel(data.userId),
      EVENT_TYPES.NEW_NOTIFICATION,
      notification
    );

    return {
      success: true,
      data: notification
    };
  } catch (error) {
    console.error("Error creating notification:", error);
    return {
      success: false,
      error: "Failed to create notification"
    };
  }
}

// Get all unread notifications for the current user
export async function getUnreadNotifications() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized"
      };
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: userId,
        isRead: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      success: true,
      data: notifications
    };
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    return {
      success: false,
      error: "Failed to fetch notifications"
    };
  }
}

// Get all notifications for the current user
export async function getAllNotifications() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized"
      };
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      success: true,
      data: notifications
    };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return {
      success: false,
      error: "Failed to fetch notifications"
    };
  }
}

// Mark a specific notification as read
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized"
      };
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return {
        success: false,
        error: "Notification not found"
      };
    }

    if (notification.userId !== userId) {
      return {
        success: false,
        error: "Unauthorized"
      };
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    return {
      success: true,
      data: updatedNotification
    };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return {
      success: false,
      error: "Failed to update notification"
    };
  }
}

// Mark all notifications as read for the current user
export async function markAllNotificationsAsRead() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized"
      };
    }

    await prisma.notification.updateMany({
      where: {
        userId: userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    return {
      success: true
    };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return {
      success: false,
      error: "Failed to update notifications"
    };
  }
} 