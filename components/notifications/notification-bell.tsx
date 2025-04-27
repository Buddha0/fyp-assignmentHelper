"use client";

import { getAllNotifications, markNotificationAsRead } from "@/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { EVENT_TYPES, getUserChannel } from "@/lib/pusher";
import { pusherClient } from "@/lib/pusher-client";
import { useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import {
  BellIcon,
  Check,
  Loader2,
  MessagesSquare,
  ShieldAlert,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "PAYMENT" | "DISPUTE" | "MESSAGE" | "SYSTEM";
  isRead: boolean;
  createdAt: Date;
  linkUrl?: string;
  sourceId?: string;
  sourceType?: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { user } = useUser();

  // Load notifications
  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      try {
        const result = await getAllNotifications();
        if (result.success) {
          // Convert the API response to match our component's Notification type
          const formattedNotifications = result.data.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type as "PAYMENT" | "DISPUTE" | "MESSAGE" | "SYSTEM",
            isRead: n.isRead,
            createdAt: n.createdAt,
            linkUrl: n.link,
            sourceId: n.sourceId,
            sourceType: n.sourceType
          }));
          setNotifications(formattedNotifications);
          const unreadCount = formattedNotifications.filter((n: Notification) => !n.isRead).length;
          setUnreadCount(unreadCount);
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();

    // Setup real-time updates
    const channel = pusherClient.subscribe(getUserChannel(user.id));
    channel.bind(EVENT_TYPES.NEW_NOTIFICATION, (data: Notification) => {
      console.log("New notification received:", data);
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(getUserChannel(user.id));
    };
  }, [user]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read in the UI immediately
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id ? { ...n, isRead: true } : n
      )
    );

    // Update unread count
    if (!notification.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Send API request to mark as read
    try {
      await markNotificationAsRead(notification.id);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }

    // Navigate to the linked page if available
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "PAYMENT":
        return <Wallet className="h-4 w-4 text-green-500" />;
      case "DISPUTE":
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case "MESSAGE":
        return <MessagesSquare className="h-4 w-4 text-blue-500" />;
      default:
        return <BellIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const markAllAsRead = async () => {
    // Update UI immediately
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true }))
    );
    setUnreadCount(0);

    // Send API request for each unread notification
    try {
      const promises = notifications
        .filter((n) => !n.isRead)
        .map((n) => markNotificationAsRead(n.id));
      await Promise.all(promises);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  return (
    <HoverCard open={isOpen} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          onClick={() => setIsOpen(!isOpen)}
        >
          <BellIcon className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </HoverCardTrigger>
      <HoverCardContent
        align="end"
        className="w-80 p-0 max-h-[400px] flex flex-col"
      >
        <div className="p-2 border-b flex items-center justify-between">
          <h3 className="font-medium text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`w-full text-left p-3 border-b last:border-b-0 flex gap-2 hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? "bg-muted/20" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="flex-shrink-0 self-start ml-2">
                    {notification.isRead ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Badge
                        variant="default"
                        className="h-2 w-2 p-0 rounded-full bg-blue-500"
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-2 border-t">
          <Link
            href="/dashboard/notifications"
            className="text-xs text-center block w-full text-muted-foreground hover:text-foreground"
          >
            View all notifications
          </Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
} 