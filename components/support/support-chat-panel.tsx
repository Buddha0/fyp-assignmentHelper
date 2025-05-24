"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SendIcon, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getUserSupportChat, sendSupportMessage, markMessagesAsRead } from "@/actions/support-chat";
import { useUser } from "@clerk/nextjs";
import { pusherClient } from "@/lib/pusher-client";
import { EVENT_TYPES, getUserChannel } from "@/lib/pusher";

// Define types for clarity
interface SupportMessage {
  id: string;
  content: string;
  createdAt: Date;
  isFromUser: boolean;
  sender: {
    id: string;
    name: string;
    image?: string;
  };
}

export function SupportChatPanel() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Load chat history when component mounts
  useEffect(() => {
    if (!user) return;
    
    const loadChatHistory = async () => {
      try {
        setIsLoading(true);
        const result = await getUserSupportChat();
        
        if (result.success) {
          // Map the returned data structure to our SupportMessage type
          const formattedMessages = result.data.messages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            createdAt: msg.createdAt,
            isFromUser: msg.senderId === user.id,
            sender: {
              id: msg.sender.id,
              name: msg.sender.name,
              image: msg.sender.image
            }
          }));
          setMessages(formattedMessages);
          
          // Mark all unread messages as read
          const unreadMessageIds = result.data.messages
            .filter((msg: any) => !msg.isRead && msg.senderId !== user.id)
            .map((msg: any) => msg.id);
            
          if (unreadMessageIds.length > 0) {
            await markMessagesAsRead(unreadMessageIds);
          }
          
        } else {
          console.error("Failed to load chat history:", result.error);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadChatHistory();
    
    // Setup real-time updates
    const channel = pusherClient.subscribe(getUserChannel(user.id));
    channel.bind(EVENT_TYPES.NEW_SUPPORT_MESSAGE, (newMessage: SupportMessage) => {
            setMessages(prev => [...prev, newMessage]);
      
      // Mark new message as read immediately if the chat is open
      if (newMessage.id && !newMessage.isFromUser) {
        markMessagesAsRead([newMessage.id]);
      }
    });
    
    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(getUserChannel(user.id));
    };
  }, [user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !user) return;
    
    try {
      setIsSending(true);
      
      // Get active session ID or use default session
      const chatSession = await getUserSupportChat();
      const sessionId = chatSession.success ? chatSession.data.id : null;
      
      if (!sessionId) {
        console.error("No active chat session");
        return;
      }
      
      const result = await sendSupportMessage(sessionId, message);
      
      if (result.success) {
        // Clear the input field
        setMessage("");
        
        // Add the new message to the UI
        const newMessage: SupportMessage = {
          id: result.data.id,
          content: result.data.content,
          createdAt: result.data.createdAt,
          isFromUser: true,
          sender: {
            id: user.id,
            name: user.fullName || user.username || "You",
            image: user.imageUrl
          }
        };
        
        setMessages(prev => [...prev, newMessage]);
      } else {
        console.error("Failed to send message:", result.error);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-muted-foreground mb-2">No messages yet</p>
            <p className="text-sm text-muted-foreground">
              Start a conversation with our support team by sending a message below.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex ${msg.isFromUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex ${msg.isFromUser ? 'flex-row-reverse' : 'flex-row'} gap-2 items-start max-w-[80%]`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.sender.image || ''} alt={msg.sender.name} />
                  <AvatarFallback>{msg.sender.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                
                <div className="space-y-1">
                  <Card className={`p-3 ${msg.isFromUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </Card>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Textarea
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isSending || !message.trim()}
            className="self-end"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
} 