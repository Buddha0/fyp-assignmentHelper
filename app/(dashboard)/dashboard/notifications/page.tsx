"use client";

import { useState, useEffect } from "react";
import { getAllNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "@/actions/notifications";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { 
  BellIcon, 
  Loader2, 
  MessagesSquare, 
  ShieldAlert, 
  Wallet,
  CheckCircle,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DashboardLayout } from "@/components/dashboard-layout";
import { posterNavItems, doerNavItems } from "@/app/(dashboard)/navigation-config";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
  link?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [readFilter, setReadFilter] = useState<string>("all");
  const [userRole, setUserRole] = useState<"poster" | "doer">("poster");
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    // Check user role based on URL path
    const path = window.location.pathname;
    if (path.includes("/doer")) {
      setUserRole("doer");
    } else {
      setUserRole("poster");
    }

    const loadNotifications = async () => {
      try {
        setIsLoading(true);
        const result = await getAllNotifications();
        
        if (result.success) {
          setNotifications(result.data);
          setFilteredNotifications(result.data);
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadNotifications();
    }
  }, [user]);

  useEffect(() => {
    // Apply filters
    let filtered = [...notifications];
    
    // Filter by read status
    if (readFilter === "read") {
      filtered = filtered.filter(notification => notification.isRead);
    } else if (readFilter === "unread") {
      filtered = filtered.filter(notification => !notification.isRead);
    }
    
    setFilteredNotifications(filtered);
  }, [notifications, readFilter]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read in the UI immediately
    setNotifications(prev =>
      prev.map(n =>
        n.id === notification.id ? { ...n, isRead: true } : n
      )
    );

    // Send API request to mark as read
    try {
      await markNotificationAsRead(notification.id);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }

    // Navigate to the linked page if available
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    // Update UI immediately
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    );

    // Send API request
    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "PAYMENT":
        return <Wallet className="h-5 w-5 text-green-500" />;
      case "DISPUTE":
        return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case "MESSAGE":
        return <MessagesSquare className="h-5 w-5 text-blue-500" />;
      default:
        return <BellIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.isRead).length;
  };

  const navItems = userRole === "doer" ? doerNavItems : posterNavItems;
  
  const content = (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {getUnreadCount() > 0 && (
            <Badge variant="secondary" className="ml-2">
              {getUnreadCount()} unread
            </Badge>
          )}
        </div>
        
        {getUnreadCount() > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleMarkAllAsRead}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>All Notifications</CardTitle>
            <Select
              value={readFilter}
              onValueChange={setReadFilter}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CardDescription>
            Your recent notifications and updates
          </CardDescription>
          <Separator />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <BellIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No notifications found</p>
              {readFilter !== "all" && (
                <Button 
                  variant="link" 
                  onClick={() => setReadFilter("all")}
                >
                  Show all notifications
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`w-full text-left p-4 rounded-md flex gap-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                    !notification.isRead ? "bg-muted/20" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">
                        {notification.title}
                        {!notification.isRead && (
                          <Badge variant="default" className="ml-2 h-2 w-2 p-0 rounded-full bg-blue-500" />
                        )}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    {notification.link && (
                      <p className="text-xs text-blue-500 mt-1 underline">
                        View details
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DashboardLayout 
      navItems={navItems} 
      userRole={userRole} 
      userName={user?.fullName || ""}
    >
      {content}
    </DashboardLayout>
  );
} 