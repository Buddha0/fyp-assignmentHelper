"use client";

import ChatInterface from "@/components/chat/ChatInterface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAssignmentUnreadCount } from "@/actions/chat";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface TaskChatProps {
  assignmentId: string;
  receiverId: string;
  receiverName?: string | null;
  isPoster: boolean;
}

export default function TaskChat({
  assignmentId,
  receiverId,
  receiverName,
  isPoster,
}: TaskChatProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const basePath = isPoster ? "/poster" : "/doer/tasks";
  
  // Load unread count
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response = await getAssignmentUnreadCount(assignmentId);
        if (response.success) {
          setUnreadCount(response.data);
        }
      } catch (error) {
        console.error("Failed to load unread count:", error);
      }
    };
    
    loadUnreadCount();
    
    // Refresh unread count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [assignmentId]);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center justify-between">
          <span className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Messages
          </span>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {isPoster
            ? "Chat with the assigned doer"
            : "Chat with the client about the task"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-96 overflow-hidden rounded-md border">
          <ChatInterface
            assignmentId={assignmentId}
            receiverId={receiverId}
            title={`Chat with ${receiverName || (isPoster ? "Doer" : "Client")}`}
          />
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href={`${basePath}/${assignmentId}/chat`}>
            Open full chat
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
} 