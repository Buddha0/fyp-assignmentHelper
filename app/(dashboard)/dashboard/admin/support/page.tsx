"use client";

import { getAllSupportChats, getSupportChatById, sendSupportMessage } from "@/actions/support-chat";
import { adminNavItems } from "@/app/(dashboard)/navigation-config";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_TYPES } from "@/lib/pusher";
import { pusherClient } from "@/lib/pusher-client";
import { useUploadThing } from "@/lib/uploadthing";
import { useUser } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import {
  FileIcon,
  Loader2,
  MessageSquare,
  PaperclipIcon,
  Search,
  SendHorizontal,
  X
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function AdminSupportPage() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [chats, setChats] = useState<any[]>([]);
  const [filteredChats, setFilteredChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messageContent, setMessageContent] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileAttachments, setFileAttachments] = useState<{url: string, name: string, type: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<string>("Initializing...");
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  // const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const autoRefreshEnabled = true;
  const [, setLastRefreshTime] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Initialize uploadThing hook for direct file uploads
  const { startUpload } = useUploadThing("adminSupportUploader", {
    onClientUploadComplete: (res) => {
      if (!res) return;
      
      // Map the response files to our format
      const newFiles = res.map((file) => ({
        url: file.url,
        name: file.name,
        type: file.type || "application/octet-stream"
      }));
      
      // Add the new files to our state - now with correct types
      setFileAttachments(prev => [...prev, ...newFiles]);
      setIsUploading(false);
      setUploadProgress(0); // Reset progress
      toast.success("Files uploaded successfully!");
    },
    onUploadError: (error) => {
      toast.error(error.message || "Failed to upload file");
      setIsUploading(false);
      setUploadProgress(0); // Reset progress on error
    },
    onUploadProgress: (progress) => {
      console.log("Upload progress:", progress);
      // Store the progress as a single number value
      setUploadProgress(typeof progress === 'number' ? progress : 0);
    },
    onUploadBegin: (fileName) => {
      console.log(`Upload started for ${fileName}`);
      setIsUploading(true);
    },
    // Set to 'all' to get frequent progress updates
    uploadProgressGranularity: 'all',
  });

  // Filter chats when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredChats(chats);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = chats.filter(chat => 
      (chat.user?.name && chat.user.name.toLowerCase().includes(query)) ||
      (chat.messages && chat.messages.some((msg: any) => 
        msg.content && msg.content.toLowerCase().includes(query)
      ))
    );
    
    setFilteredChats(filtered);
  }, [searchQuery, chats]);

  // Function for silent refresh - needs to be accessible outside the effect
  const refreshChatsSilently = useCallback(async () => {
    try {
      console.log("Silently refreshing chat data...");
      const result = await getAllSupportChats();
      
      if (result.success && result.data && Array.isArray(result.data)) {
        console.log("Silent refresh successful, updating data");
        setChats(result.data);
        setFilteredChats(result.data);
        
        // If there's an active chat, refresh it too
        if (activeChat) {
          getSupportChatById(activeChat.id).then(chatResult => {
            if (chatResult.success) {
              setActiveChat(chatResult.data);
            }
          }).catch(err => console.error("Error refreshing active chat:", err));
        }
      } else if (result.success === false) {
        console.warn("Silent refresh failed:", result.error);
      }
    } catch (error) {
      console.error("Error during silent refresh:", error);
    }
  }, [activeChat]);

  // Load all support chats
  useEffect(() => {
    let mounted = true;
    
    // Initial load with loading indicators
    async function loadChats() {
      setIsLoading(true);
      setLoadingError(null);
      setLoadingStage("Initializing...");
      setLoadingProgress(10);
      
      // Set a timeout to prevent infinite loading
      const loadingTimeout = setTimeout(() => {
        if (mounted) {
          console.log("Loading timeout reached - resetting loading state");
          setIsLoading(false);
          setLoadingError("Loading took too long. Please try refreshing.");
        }
      }, 10000); // 10 seconds timeout
      
      try {
        console.log("Loading all support chats for admin view");
        setLoadingStage("Fetching support chats...");
        setLoadingProgress(30);
        
        const result = await getAllSupportChats();
        console.log("Support chats response:", result);
        
        if (!mounted) return;
        
        setLoadingStage("Processing data...");
        setLoadingProgress(70);
        
        if (result.success) {
          console.log("Support chats loaded:", result.data);
          setLastRefreshTime(new Date());
          // Only set active chats if we have data
          if (result.data && Array.isArray(result.data)) {
            setChats(result.data);
            setFilteredChats(result.data);
            setLoadingStage("Complete");
            setLoadingProgress(100);
          } else {
            console.error("No chat data returned or invalid format");
            setChats([]);
            setFilteredChats([]);
            setLoadingError("Invalid data format returned");
          }
        } else {
          console.error("Failed to load chats:", result.error);
          setLoadingError(result.error || "Failed to load chats");
          toast.error("Failed to load chats");
        }
      } catch (error) {
        console.error("An error occurred loading chats:", error);
        if (mounted) {
          setLoadingError("An unexpected error occurred");
          toast.error("An error occurred");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          clearTimeout(loadingTimeout);
        }
      }
    }

    // Initial load with full UI feedback
    loadChats();
    
    // Set up polling with silent refresh
    if (autoRefreshEnabled) {
      intervalRef.current = setInterval(() => {
        if (mounted) refreshChatsSilently();
      }, 30000);
    }
    
    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [searchQuery, activeChat, autoRefreshEnabled, refreshChatsSilently]);

  // Subscribe to pusher channel for admin notifications
  useEffect(() => {
    console.log("Setting up Pusher subscription for admin-support channel");
    const channel = pusherClient.subscribe('admin-support');
    
    channel.bind(EVENT_TYPES.NEW_SUPPORT_MESSAGE, (data: any) => {
      console.log("New support message received via Pusher:", data);
      // Refresh the chat list
      refreshChatsSilently();
      
      // If this message is for the currently active chat, update it
      if (activeChat && data.sessionId === activeChat.id) {
        getSupportChatById(activeChat.id).then(chatResult => {
          if (chatResult.success) {
            setActiveChat(chatResult.data);
          }
        });
      }
    });
    
    return () => {
      console.log("Cleaning up Pusher subscription");
      channel.unbind(EVENT_TYPES.NEW_SUPPORT_MESSAGE);
      pusherClient.unsubscribe('admin-support');
    };
  }, [activeChat, refreshChatsSilently]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeChat?.messages]);

  // Function to load a specific chat
  const loadChat = async (chatId: string) => {
    setIsLoading(true);
    setLoadingStage("Loading conversation...");
    setLoadingProgress(20);
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log("Chat loading timeout reached - resetting loading state");
      setIsLoading(false);
      toast.error("Loading took too long. Please try again.");
    }, 8000); // 8 seconds timeout
    
    try {
      console.log("Loading specific chat:", chatId);
      setLoadingProgress(50);
      
      const result = await getSupportChatById(chatId);
      console.log("Chat load result:", result);
      setLoadingProgress(80);
      
      if (result.success) {
        setActiveChat(result.data);
        setLoadingProgress(100);
      } else {
        console.error("Failed to load chat:", result.error);
        toast.error("Failed to load chat");
      }
    } catch (error) {
      console.error("Error loading chat:", error);
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
      clearTimeout(loadingTimeout);
    }
  };

  // Handle file attachment
  const handleFileAttachment = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      setUploadProgress(10); // Initial progress
      
      try {
        console.log("Starting file upload");
        const files = Array.from(e.target.files);
        
        // Upload the files using uploadThing
        setUploadProgress(30);
        const uploadResult = await startUpload(files);
        setUploadProgress(90);
        
        if (!uploadResult) {
          throw new Error("Upload failed");
        }
        
        // The result will be handled by the onClientUploadComplete callback
        // which sets fileAttachments and resets progress
        
      } catch (error) {
        console.error("Error uploading files:", error);
        toast.error("Failed to upload files");
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  // Send a message
  const handleSendMessage = async () => {
    if (!activeChat || (!messageContent.trim() && fileAttachments.length === 0)) return;
    
    setSendingMessage(true);
    
    try {
      // Create message content - if no text but files are attached, use a default message
      const finalContent = messageContent.trim() || (fileAttachments.length > 0 ? "Sent attachments" : "");
      
      // Send the message with uploaded files - now correctly typed
      const result = await sendSupportMessage(
        activeChat.id, 
        finalContent,
        fileAttachments.length > 0 ? fileAttachments : undefined
      );
      
      if (result.success) {
        setMessageContent("");
        setFileAttachments([]);
        
        // Update the active chat with the new message
        setActiveChat((prev: any) => ({
          ...prev,
          messages: [...prev.messages, result.data],
        }));
      } else {
        toast.error("Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
      setSendingMessage(false);
    }
  };

  // Format timestamp for messages
  const formatMessageTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get the last message preview
  const getLastMessage = (chat: any) => {
    if (!chat.messages || chat.messages.length === 0) {
      return "No messages yet";
    }
    
    const lastMessage = chat.messages[0]; // The query already sorted by desc
    return lastMessage.content.slice(0, 40) + (lastMessage.content.length > 40 ? "..." : "");
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <DashboardLayout navItems={adminNavItems} userRole="admin" userName={user?.fullName || "Admin"}>
      <div className="flex flex-col h-screen max-h-screen overflow-hidden">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Support Chat</h1>
            <p className="text-muted-foreground">Manage support conversations with users</p>
          </div>
        </div>

        <div className="flex flex-1 gap-6 h-full overflow-hidden">
          {/* Chat list */}
          <div className="w-1/3 overflow-y-auto border rounded-lg">
            <div className="p-4 border-b">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8"
                />
              </div>
            </div>
            
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-4 w-4/5 bg-muted rounded mb-2"></div>
                  <div className="h-4 w-3/5 bg-muted rounded"></div>
                  <div className="mt-4 h-2 w-full bg-gray-200 rounded-full">
                    <div 
                      className="h-2 bg-primary rounded-full" 
                      style={{ width: `${loadingProgress}%` }}
                    ></div>
                  </div>
                </div>
                <p className="mt-4">{loadingStage}</p>
              </div>
            ) : loadingError ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-destructive mb-2">Error loading conversations</p>
                <p className="text-xs">{loadingError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    getAllSupportChats().then(result => {
                      if (result.success) {
                        console.log("Refreshed chats:", result.data);
                        setChats(result.data);
                        setFilteredChats(result.data);
                        setLoadingError(null);
                      }
                    });
                  }}
                >
                  Try Again
                </Button>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12 opacity-20 mb-2" />
                <p>No support conversations found</p>
                <p className="text-xs mt-2">
                  {chats.length === 0 
                    ? "No user has started a conversation yet." 
                    : "No conversations matching your search criteria."}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    getAllSupportChats().then(result => {
                      if (result.success) {
                        console.log("Refreshed chats:", result.data);
                        setChats(result.data);
                        setFilteredChats(result.data);
                      }
                    });
                  }}
                >
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`p-4 cursor-pointer hover:bg-muted/50 ${
                      activeChat?.id === chat.id ? "bg-muted" : ""
                    }`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={chat.user?.image || ""} />
                        <AvatarFallback>
                          {getInitials(chat.user?.name || "User")}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">
                            {chat.user?.name || "User"}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(chat.updatedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {getLastMessage(chat)}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={chat.status === "open" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {chat.status === "open" ? "Active" : "Closed"}
                          </Badge>
                          
                          {chat.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {chat.unreadCount} new
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col border rounded-lg overflow-hidden" >
            {!activeChat ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-16 w-16 opacity-20 mb-4" />
                  <h3 className="text-lg font-medium">Select a conversation</h3>
                  <p className="text-sm">Choose a chat from the list to view messages</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={activeChat.user?.image || ""} />
                      <AvatarFallback>
                        {getInitials(activeChat.user?.name || "User")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{activeChat.user?.name || "User"}</h3>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge
                          variant="default"
                          className="text-xs"
                        >
                          Active
                        </Badge>
                        <span className="text-muted-foreground">
                          Started {formatDistanceToNow(new Date(activeChat.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: "calc(100% - 140px)", maxHeight: "100%" }}>
                  {activeChat.messages?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p>No messages in this conversation yet</p>
                    </div>
                  ) : (
                    activeChat.messages?.map((message: any) => {
                      const isAdmin = message.sender?.role === "ADMIN";
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`flex gap-2 max-w-[80%] ${
                              isAdmin ? "flex-row-reverse" : "flex-row"
                            }`}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={message.sender?.image || ""} />
                              <AvatarFallback>
                                {getInitials(message.sender?.name || "")}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={`rounded-lg px-3 py-2 ${
                                isAdmin
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <div className="flex justify-between items-center gap-4">
                                <span className="text-xs font-medium">
                                  {message.sender?.name ||
                                    (isAdmin ? "Support Team" : "User")}
                                </span>
                                <span className="text-xs opacity-70">
                                  {formatMessageTime(message.createdAt)}
                                </span>
                              </div>
                              <p className="mt-1 text-sm whitespace-pre-wrap">{message.content}</p>
                              
                              {/* Display file attachments if present */}
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                  {message.attachments.map((attachment, idx) => {
                                    // Determine file type to display appropriate preview
                                    const isImage = attachment.type?.startsWith('image/');
                                    
                                    return (
                                      <a
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        key={idx}
                                        className="block border rounded overflow-hidden hover:bg-gray-50 transition-colors"
                                      >
                                        {isImage ? (
                                          <div className="relative h-32 w-full">
                                            <Image
                                              src={attachment.url}
                                              alt={attachment.name}
                                              fill
                                              className="object-cover"
                                              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                            />
                                          </div>
                                        ) : (
                                          <div className="p-3 flex flex-col items-center justify-center h-32">
                                            <FileIcon 
                                              className="h-10 w-10 text-muted-foreground mb-2" 
                                            />
                                            <p className="text-xs text-center line-clamp-2">{attachment.name}</p>
                                          </div>
                                        )}
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Display selected files */}
                {fileAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 px-4">
                    {fileAttachments.map((file, index) => (
                      <div key={index} className="flex items-center px-3 py-2 bg-muted rounded-md">
                        <FileIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-xs mr-2">{file.name}</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 ml-1 flex-shrink-0" 
                          onClick={() => setFileAttachments(files => files.filter((_, i) => i !== index))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload progress indicator */}
                {isUploading && (
                  <div className="mb-3 space-y-1 px-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium flex items-center">
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        Uploading files... {uploadProgress > 0 ? `(${Math.floor(uploadProgress)}%)` : ''}
                      </span>
                      {uploadProgress > 0 && (
                        <span className="text-xs">{Math.floor(uploadProgress)}%</span>
                      )}
                    </div>
                    {uploadProgress > 0 && (
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Message input */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      className="resize-none"
                      rows={2}
                      disabled={isUploading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={handleFileAttachment}
                        className="h-8 w-8"
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <PaperclipIcon className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={sendingMessage || (!messageContent.trim() && fileAttachments.length === 0) || isUploading}
                      >
                        {sendingMessage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SendHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.txt"
      />
    </DashboardLayout>
  );
} 