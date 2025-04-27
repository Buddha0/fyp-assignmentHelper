"use client";

import { getUnreadMessageCount } from "@/actions/chat";
import { useEffect, useState } from "react";

export default function UnreadBadge() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        setIsLoading(true);
        const response = await getUnreadMessageCount();
        
        if (response.success) {
          setUnreadCount(response.data);
        }
      } catch (error) {
        console.error("Failed to get unread message count", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnreadCount();

    // Set up an interval to periodically check for new messages
    const interval = setInterval(fetchUnreadCount, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (isLoading || unreadCount === 0) {
    return null;
  }

  return (
    <span className="absolute top-0 right-0 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-primary text-primary-foreground">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
} 