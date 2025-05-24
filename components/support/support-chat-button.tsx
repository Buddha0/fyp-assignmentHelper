"use client";

import { getUnreadSupportMessageCount } from "@/actions/support-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EVENT_TYPES, getUserChannel } from "@/lib/pusher";
import { pusherClient } from "@/lib/pusher-client";
import { useUser } from "@clerk/nextjs";
import { LifeBuoy } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SupportChatPanel } from "./support-chat-panel";

export function SupportChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  // Check if we're on the support page and handle visibility
  useEffect(() => {
    // Check if we're on the admin support page
    const isAdminSupportPage = pathname === "/dashboard/admin/support";
    
    // Set admin status based on URL for immediate visual consistency
    const isAdminBasedOnPath = pathname.includes("/dashboard/admin");
    setIsAdmin(isAdminBasedOnPath);
    
    // Hide the button if we're on the admin support page
    setShouldRender(!isAdminSupportPage);
  }, [pathname]);

  // Check user role
  useEffect(() => {
    async function checkUserRole() {
      try {
        // First try to get the role from the API
        const response = await fetch('/api/user/role');
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.role === "ADMIN");
          return;
        }
        
        // Fallback: check if the URL includes admin path
        const isAdminPath = pathname.includes("/dashboard/admin");
        if (isAdminPath) {
          setIsAdmin(true);
          return;
        }
        
        // Another fallback: check unread messages endpoint response
        const result = await getUnreadSupportMessageCount();
        if (result.success) {
          // If we're getting a count of messages from others, we're likely an admin
          const isLikelyAdmin = result.data > 0 && pathname.includes("/dashboard");
          setIsAdmin(isLikelyAdmin);
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        // Fallback to URL-based detection if API call fails
        const isAdminPath = pathname.includes("/dashboard/admin");
        setIsAdmin(isAdminPath);
      }
    }

    if (user) {
      checkUserRole();
    }
  }, [user, pathname]);
  
  // Check for unread messages on load
  useEffect(() => {
    if (!user) return;
    
    const checkUnreadMessages = async () => {
      try {
                const result = await getUnreadSupportMessageCount();
                
        if (result.success) {
          setUnreadCount(result.data);
        } else {
          console.error("Failed to get unread count:", result.error);
        }
      } catch (error) {
        console.error("Error checking unread messages:", error);
      }
    };
    
    checkUnreadMessages();
    
    // Listen for new messages
    const channel = pusherClient.subscribe(getUserChannel(user.id));
    channel.bind(EVENT_TYPES.NEW_SUPPORT_MESSAGE, () => {
            if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    });
    
    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(getUserChannel(user.id));
    };
  }, [user, isOpen]);
  
  // Reset unread count when opening the chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    } else if (user) {
      // When dialog is closed, fetch the latest unread count
      // This ensures the badge state is synced with the database
      const refreshUnreadCount = async () => {
        const result = await getUnreadSupportMessageCount();
        if (result.success) {
          setUnreadCount(result.data);
        }
      };
      
      refreshUnreadCount();
    }
  }, [isOpen, user]);

  // Handle support button click
  const handleSupportClick = () => {
    if (isAdmin) {
      // Redirect admin to the admin support page
      router.push('/dashboard/admin/support');
    } else {
      // Open the chat dialog for regular users
      setIsOpen(true);
    }
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 relative"
        onClick={handleSupportClick}
      >
        <LifeBuoy className="h-4 w-4" />
        <span>{isAdmin ? "Support Inbox" : "Help & Support"}</span>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {!isAdmin && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Help & Support</DialogTitle>
              <DialogDescription>
                Chat with our support team. We're here to help!
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden">
              <SupportChatPanel />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 