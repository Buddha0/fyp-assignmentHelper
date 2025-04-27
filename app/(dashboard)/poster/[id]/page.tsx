"use client";

import { getTaskDetails, updateSubmissionStatus } from "@/actions/utility/task-utility";
import { getUserId } from "@/actions/utility/user-utilit";
import ChatInterface from "@/components/chat/ChatInterface";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Calendar,
  CheckCircle,
  DollarSign,
  Download,
  FileIcon,
  FileSpreadsheet,
  FileText,
  Home,
  ImageIcon,
  Loader2,
  MessageSquare,
  Music,
  PencilLine,
  Trash2,
  Users,
  Video
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const navItems = [
  {
    href: "/poster",
    label: "Dashboard",
    icon: Home,
  },
  {
    href: "/poster/tasks",
    label: "My Tasks",
    icon: FileText,
  },
  {
    href: "/poster/create-task",
    label: "Create Task",
    icon: PencilLine,
  },
];

interface TaskData {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  deadline: Date;
  status: string;
  attachments: any[];
  doerInfo: {
    id: string;
    name: string | null;
    image: string | null;
    rating: number | null;
    bio: string | null;
  } | null;
  messages: Array<{
    id: string;
    content: string;
    createdAt: Date;
    sender: {
      id: string;
      name: string | null;
      image: string | null;
    };
  }>;
  bids: Array<{
    id: string;
    content: string;
    bidAmount: number;
    status: string;
    createdAt: Date;
    user: {
      id: string;
      name: string | null;
      image: string | null;
      rating: number | null;
    };
  }>;
  submissions: Array<{
    id: string;
    content: string;
    status: string;
    createdAt: Date;
    attachments: any[];
    user: {
      id: string;
      name: string | null;
      image: string | null;
      rating: number | null;
    };
  }>;
  payment: any;
}

export default function TaskDetail() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const [activeTab, setActiveTab] = useState("details");
  const [task, setTask] = useState<TaskData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch task details from the database
  useEffect(() => {
    const fetchTaskDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get the current user's ID from auth
        let userId;
        try {
          userId = await getUserId();
        } catch (authError) {
          console.error("Auth error:", authError);
          setError("Authentication error. Please sign in again.");
          setIsLoading(false);
          return;
        }
        
        const response = await getTaskDetails(taskId, userId);
        
        if (response.success && response.data) {
          // Log the raw data to help with debugging
          console.log("Raw task data:", response.data);
          console.log("Submissions:", response.data.submissions);
          if (response.data.submissions && response.data.submissions.length > 0) {
            console.log("First submission attachments:", response.data.submissions[0].attachments);
          }
          
          // Transform the data to ensure attachments and submissions match expected types
          const taskData = {
            ...response.data,
            attachments: Array.isArray(response.data.attachments) 
              ? response.data.attachments 
              : response.data.attachments ? [response.data.attachments] : [],
            submissions: response.data.submissions?.map((sub: any) => {
              // Handle both array and non-array attachments
              const attachments = Array.isArray(sub.attachments) 
                ? sub.attachments 
                : sub.attachments ? [sub.attachments] : [];
                
              console.log(`Processing submission ${sub.id}, attachments:`, attachments);
              
              return {
              ...sub,
                attachments: attachments
              };
            }) || []
          };
          setTask(taskData);
        } else {
          setError(response.error || "Failed to load task");
        }
      } catch (err) {
        console.error("Error fetching task details:", err);
        setError("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTaskDetails();
  }, [taskId]);

  const formatDate = (dateString: string | Date) => {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-blue-500";
      case "assigned":
        return "bg-orange-500";
      case "in-progress":
      case "in_progress":
        return "bg-yellow-500";
      case "under-review":
      case "pending-review":
        return "bg-purple-500";
      case "completed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "Open";
      case "assigned":
        return "Assigned";
      case "in-progress":
      case "in_progress":
        return "In Progress";
      case "under-review":
      case "pending-review":
        return "Under Review";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const handleDeleteTask = () => {
    // Logic to delete task
    console.log("Deleting task:", taskId);
  };

  const handleEditTask = () => {
    router.push(`/poster/create-task?edit=${taskId}`);
  };

  const handleApproveSubmission = async (submissionId: string) => {
    try {
      // Get user ID from auth
      const userId = await getUserId();
      
      // Call the server action to approve the submission
      const result = await updateSubmissionStatus(submissionId, userId, 'approved');
      
      if (result.success) {
        toast.success(result.message || "Submission approved successfully");
        // Update local state to reflect the changes
        setTask(prevTask => {
          if (!prevTask) return null;
          
          return {
            ...prevTask,
            status: "completed",
            submissions: prevTask.submissions.map(sub => 
              sub.id === submissionId 
                ? { ...sub, status: "approved" } 
                : sub
            )
          };
        });
      } else {
        toast.error(result.error || "Failed to approve submission");
      }
    } catch (error) {
      console.error("Error approving submission:", error);
      toast.error("Failed to approve submission");
    }
  };

  const handleRejectSubmission = async (submissionId: string) => {
    try {
      // Get user ID from auth
      const userId = await getUserId();
      
      // Call the server action to reject the submission
      const result = await updateSubmissionStatus(submissionId, userId, 'rejected');
      
      if (result.success) {
        toast.success(result.message || "Submission rejected");
        // Update local state to reflect the changes
        setTask(prevTask => {
          if (!prevTask) return null;
          
          return {
            ...prevTask,
            status: "in-progress",
            submissions: prevTask.submissions.map(sub => 
              sub.id === submissionId 
                ? { ...sub, status: "rejected" } 
                : sub
            )
          };
        });
      } else {
        toast.error(result.error || "Failed to reject submission");
      }
    } catch (error) {
      console.error("Error rejecting submission:", error);
      toast.error("Failed to reject submission");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout navItems={navItems} userRole="poster" userName="User">
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-xl">Loading task details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !task) {
    return (
      <DashboardLayout navItems={navItems} userRole="poster" userName="User">
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error || "Task not found"} <Link href="/poster/tasks" className="underline">Return to tasks</Link>
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    
    <DashboardLayout navItems={navItems} userRole="poster" userName="User">
       <h1>asdas</h1>  
           <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/poster/tasks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{task.title}</h1>
          <Badge className={`${getStatusColor(task.status)} text-white ml-2`}>{getStatusLabel(task.status)}</Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3 w-full">
          <div className="md:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="attachments">Attachments</TabsTrigger>
                <TabsTrigger value="bids">{task.status === 'open' ? `Bids (${task.bids.length})` : 'Bids'}</TabsTrigger>
                {task.doerInfo && <TabsTrigger value="messages">Messages</TabsTrigger>}
                {task.status !== 'open' && <TabsTrigger value="submissions">Submissions</TabsTrigger>}
              </TabsList>

              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Task Description</CardTitle>
                  </CardHeader>
                  <CardContent className="prose max-w-full">
                    <div dangerouslySetInnerHTML={{ __html: task.description }} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attachments" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Task Attachments</CardTitle>
                    <CardDescription>
                      Files attached to this task
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {task.attachments && task.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {task.attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 border rounded-md"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-500" />
                              <span>{attachment.name || `Attachment ${index + 1}`}</span>
                            </div>
                            <Button size="sm" variant="ghost" asChild>
                              <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No attachments available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bids" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Received Bids</CardTitle>
                    <CardDescription>
                      {task.status === 'open' 
                        ? `You have received ${task.bids.length} bid${task.bids.length !== 1 ? 's' : ''} for this task` 
                        : task.doerInfo 
                          ? `You've accepted a bid for this task` 
                          : `Bids for this task`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {task.bids && task.bids.length > 0 ? (
                      <div className="space-y-4">
                        {task.bids.map((bid) => (
                          <div key={bid.id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={bid.user.image || undefined} />
                                  <AvatarFallback>{bid.user.name?.charAt(0) || "D"}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{bid.user.name || "Anonymous Doer"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Rating: {bid.user.rating ? `${bid.user.rating.toFixed(1)}/5` : "No ratings yet"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  className={bid.status === "accepted" 
                                    ? "bg-green-500" 
                                    : bid.status === "rejected" 
                                      ? "bg-red-500" 
                                      : "bg-blue-500"}
                                >
                                  {bid.status === "pending" ? "Pending" : bid.status}
                                </Badge>
                                <p className="font-semibold text-green-600">${bid.bidAmount.toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm mt-2">{bid.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">Submitted on {formatDate(bid.createdAt)}</p>
                            </div>
                            {task.status === 'open' && bid.status === 'pending' && (
                              <div className="mt-4 flex gap-2 justify-end">
                                <Button variant="outline" size="sm">Reject</Button>
                                <Button size="sm">Accept Bid</Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p>No bids received yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Once doers place bids, they will appear here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {task.doerInfo && (
                <TabsContent value="messages" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Messages</CardTitle>
                      <CardDescription>
                        Communicate with {task.doerInfo.name || "the doer"} about the task
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChatInterface
                        assignmentId={task.id}
                        receiverId={task.doerInfo.id}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {task.status !== 'open' && (
                <TabsContent value="submissions" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Task Submissions</CardTitle>
                      <CardDescription>
                        {task.submissions.length > 0 
                          ? `${task.submissions.length} submission${task.submissions.length !== 1 ? 's' : ''} received` 
                          : "No submissions yet"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {task.submissions && task.submissions.length > 0 && (
                        <div className="mt-5">
                          <div className="space-y-3 ml-0">
                            <h3 className="text-lg font-semibold">Submissions</h3>
                            {task.submissions.map((submission) => (
                              <div
                                key={submission.id}
                                className="bg-white p-5 rounded-lg shadow-md border border-gray-200"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center space-x-3">
                                    <Image
                                      src={submission.user.image || "/images/placeholder.png"}
                                      alt={submission.user.name}
                                      width={40}
                                      height={40}
                                      className="rounded-full"
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {submission.user.name}
                                      </span>
                                      <span className="text-sm text-gray-500">
                                        {formatDate(submission.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                <Badge
                                      className={cn(
                                        "capitalize",
                                        submission.status === "pending"
                                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                          : submission.status === "accepted"
                                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                                          : "bg-red-100 text-red-800 hover:bg-red-100"
                                      )}
                                >
                                  {submission.status}
                                </Badge>
                              </div>
                                </div>

                                <div className="mt-3">
                                  <p className="text-gray-700">{submission.content}</p>
                                </div>

                                {/* Debug information */}
                                {process.env.NODE_ENV === 'development' && (
                                  <div className="mt-2 p-2 bg-gray-100 text-xs">
                                    <p>Debug Info:</p>
                                    <pre>
                                      {JSON.stringify({
                                        hasAttachments: !!submission.attachments,
                                        attachmentsLength: submission.attachments ? 
                                          (Array.isArray(submission.attachments) ? submission.attachments.length : 'not an array') : 0,
                                        firstAttachment: submission.attachments && Array.isArray(submission.attachments) && submission.attachments.length > 0 ?
                                          { url: submission.attachments[0].url, name: submission.attachments[0].name } : 'none'
                                      }, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {submission.attachments && Array.isArray(submission.attachments) && submission.attachments.length > 0 && (
                                  <div className="mt-4">
                                    <p className="font-medium mb-2">Attachments:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {submission.attachments.map((attachment: any, i: number) => {
                                        if (!attachment || !attachment.url) {
                                          console.error("Invalid attachment:", attachment);
                                          return null;
                                        }
                                        
                                        const fileUrl = attachment.url;
                                        const fileName = attachment.name || fileUrl.split('/').pop() || `File ${i+1}`;
                                        const fileType = attachment.type || 'application/octet-stream';
                                        
                                        // Determine the file icon based on type or extension
                                        let icon = <FileIcon className="h-5 w-5 mr-1" />;
                                        
                                        if (fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                                          icon = <ImageIcon className="h-5 w-5 mr-1" />;
                                        } else if (fileType.startsWith('video/') || fileName.match(/\.(mp4|avi|mov|wmv)$/i)) {
                                          icon = <Video className="h-5 w-5 mr-1" />;
                                        } else if (fileType.startsWith('audio/') || fileName.match(/\.(mp3|wav|ogg)$/i)) {
                                          icon = <Music className="h-5 w-5 mr-1" />;
                                        } else if (fileType === 'application/pdf' || fileName.match(/\.pdf$/i)) {
                                          icon = <FileText className="h-5 w-5 mr-1" />;
                                        } else if (fileName.match(/\.(doc|docx)$/i)) {
                                          icon = <FileText className="h-5 w-5 mr-1" />;
                                        } else if (fileName.match(/\.(xls|xlsx)$/i)) {
                                          icon = <FileSpreadsheet className="h-5 w-5 mr-1" />;
                                        } else if (fileName.match(/\.(zip|rar|7z)$/i)) {
                                          icon = <Archive className="h-5 w-5 mr-1" />;
                                        }
                                        
                                        return (
                                          <a
                                            key={`${submission.id}-${i}-${fileUrl}`}
                                            href={fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                            className="inline-flex items-center px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                                        >
                                            {icon}
                                            <span className="truncate max-w-[200px]">
                                              {fileName}
                                            </span>
                                        </a>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}

                              {submission.status === "pending" && (
                                  <div className="mt-4 flex space-x-2">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() =>
                                        handleApproveSubmission(submission.id)
                                      }
                                      className="bg-green-600 hover:bg-green-700"
                                      disabled={isLoading}
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleRejectSubmission(submission.id)
                                      }
                                      className="text-red-600 border-red-600 hover:bg-red-50"
                                      disabled={isLoading}
                                    >
                                      Reject
                                    </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-muted-foreground">Budget</p>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1 text-green-500" />
                    <span className="font-medium">${task.budget.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-orange-500" />
                    <span>{formatDate(task.deadline)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <Badge variant="outline">{task.category}</Badge>
                </div>
                <Separator />
                
                {task.doerInfo ? (
                  <div>
                    <p className="text-sm font-medium mb-2">Assigned Doer</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={task.doerInfo.image || undefined} />
                        <AvatarFallback>{task.doerInfo.name?.charAt(0) || "D"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{task.doerInfo.name || "Anonymous Doer"}</p>
                        <p className="text-xs text-muted-foreground">
                          Rating: {task.doerInfo.rating ? `${task.doerInfo.rating.toFixed(1)}/5` : "No ratings yet"}
                        </p>
                      </div>
                    </div>
                    {task.doerInfo.bio && (
                      <p className="text-sm mt-2 text-muted-foreground line-clamp-3">{task.doerInfo.bio}</p>
                    )}
                  </div>
                ) : (
                  task.status === 'open' && (
                    <div className="text-center py-2">
                      <p className="text-sm text-muted-foreground">No doer assigned yet</p>
                    </div>
                  )
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                {task.status === "open" && (
                  <>
                    <Button variant="outline" className="w-full" onClick={handleEditTask}>
                      <PencilLine className="mr-2 h-4 w-4" />
                      Edit Task
                    </Button>
                    <Button variant="destructive" className="w-full" onClick={handleDeleteTask}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Task
                    </Button>
                  </>
                )}
                
                {task.doerInfo && (
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab("messages")}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Message Doer
                  </Button>
                )}
                
                {task.status === 'open' && task.bids.length > 0 && (
                  <Button className="w-full" onClick={() => setActiveTab("bids")}>
                    <Users className="mr-2 h-4 w-4" />
                    View Bids ({task.bids.length})
                  </Button>
                )}

                {task.status === 'under-review' && (
                  <Button className="w-full" onClick={() => setActiveTab("submissions")}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Review Submission
                  </Button>
                )}
              </CardFooter>
            </Card>

            {task.payment && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-muted-foreground">Amount</p>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-green-500" />
                      <span className="font-medium">${task.payment.amount?.toFixed(2) || task.budget.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge
                      className={
                        task.payment.status === "COMPLETED"
                          ? "bg-green-500"
                          : task.payment.status === "REFUNDED"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }
                    >
                      {task.payment.status}
                    </Badge>
                  </div>
                  {task.payment.createdAt && (
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-muted-foreground">Date</p>
                      <span className="text-sm">{formatDate(task.payment.createdAt)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 