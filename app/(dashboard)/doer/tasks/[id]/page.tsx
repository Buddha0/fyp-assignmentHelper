"use client"

import { fetchTaskDirectly } from "@/actions/doer-dashboard"
import { createTaskSubmission, submitBid, updateTaskStatus } from "@/actions/utility/task-utility"
import { getUserId } from "@/actions/utility/user-utility"
import { doerNavItems } from "@/app/(dashboard)/navigation-config"
import ChatInterface from "@/components/chat/ChatInterface"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DisputeResponseForm } from "@/components/dispute-response-form"
import { PlaceBidDialog } from "@/components/place-bid-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { EVENT_TYPES, getTaskChannel, pusherClient } from "@/lib/pusher"
import { useUploadThing } from "@/lib/uploadthing"
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  FileText,
  ListChecks,
  Loader2,
  MessageSquare,
  Paperclip,
  X
} from "lucide-react"
import Link from "next/link"
import { useParams } from 'next/navigation'
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface TaskData {
  id: string
  title: string
  description: string
  category: string
  budget: number
  deadline: Date
  status: string
  attachments: any
  poster: {
    id: string
    name: string | null
    image: string | null
    rating: number | null
    memberSince: Date
  } | null
  messages: Array<{
    id: string
    content: string
    createdAt: Date
    sender: {
      id: string
      name: string | null
      image: string | null
    }
  }>
  submissions: Array<{
    id: string
    content: string
    status: string
    createdAt: Date
    attachments: any
  }>
  bid: {
    id: string
    amount: number
    timeframe: string
    message: string
    status: string
  } | null
  disputes?: Array<{
    id: string
    reason: string
    status: string
    createdAt: Date
    initiatorId: string
    hasResponse: boolean
    response?: string
  }>
  payment?: {
    id: string
    status: 'PENDING' | 'COMPLETED' | 'REFUNDED' | 'DISPUTED' | 'RELEASED'
    amount: number
    createdAt: Date
  } | null
}

export default function TaskDetail() {
  const params = useParams()
  const taskId = params.id as string
  
  console.log("Task ID from params:", taskId, "Params object:", params);
  
  // Debug the task ID format
  if (taskId) {
    console.log("Task ID length:", taskId.length);
    console.log("Task ID characters:", [...taskId].map(c => `${c} (${c.charCodeAt(0)})`).join(', '));
  }

  const [activeTab, setActiveTab] = useState("details")
  const [submissionMessage, setSubmissionMessage] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<{url: string, name: string, type: string}[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [task, setTask] = useState<TaskData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [disputeReason, setDisputeReason] = useState("")
  const [disputeEvidence, setDisputeEvidence] = useState<{url: string, name: string, type: string}[]>([])
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [bidDialogOpen, setBidDialogOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0) // Progress for all uploads
  const [submissionUploadProgress, setSubmissionUploadProgress] = useState(0) // Progress specifically for submission uploads

  // Check if task is finalized (completed or dispute resolved or cancelled)
  const isTaskFinalized = task?.status?.toLowerCase() === "completed" || 
    task?.status?.toLowerCase() === "cancelled" ||
    (task?.status?.toLowerCase() === "in_dispute" && (task?.payment?.status === "RELEASED" || task?.payment?.status === "REFUNDED"));

  // Initialize the useUploadThing hook for dispute evidence
  const { startUpload: startDisputeUpload } = useUploadThing("evidence", {
    onClientUploadComplete: (res) => {
      if (!res) return;
      
      const newFiles = res.map((file) => ({
        url: file.url,
        name: file.name,
        type: file.type || 'application/octet-stream'
      }));
      
      setDisputeEvidence(prev => [...prev, ...newFiles]);
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
    onUploadBegin: () => {
      console.log("Upload started");
    },
    // Set to 'all' to get frequent progress updates
    uploadProgressGranularity: 'all',
  });

  // Initialize the useUploadThing hook for submission uploads
  const { startUpload: startSubmissionUpload } = useUploadThing("fileSubmissionUploader", {
    onClientUploadComplete: (res) => {
      if (!res) return;
      
      const newFiles = res.map((file) => ({
        url: file.url || file.ufsUrl, // Support both properties
        name: file.name || (file.url || file.ufsUrl).split('/').pop() || 'File',
        type: file.type || 'application/octet-stream'
      }));
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
      setIsUploading(false);
      setSubmissionUploadProgress(0); // Reset progress
      toast.success("Files uploaded successfully!");
    },
    onUploadError: (error) => {
      toast.error(error.message || "Failed to upload file");
      setIsUploading(false);
      setSubmissionUploadProgress(0); // Reset progress on error
    },
    onUploadProgress: (progress) => {
      console.log("Submission upload progress:", progress);
      // Store the progress as a single number value
      setSubmissionUploadProgress(typeof progress === 'number' ? progress : 0);
    },
    onUploadBegin: () => {
      console.log("Submission upload started");
    },
    // Set to 'all' to get frequent progress updates
    uploadProgressGranularity: 'all',
  });

  // Fetch current user ID on component mount
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userId = await getUserId();
        setCurrentUserId(userId);
      } catch (error) {
        console.error("Error fetching user ID:", error);
      }
    };
    
    fetchUserId();
  }, []);

  // Fetch task details from the database - completely replaced with simpler version
  useEffect(() => {
    const fetchTaskDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("Fetching task details for ID:", taskId);
        
        // Use our direct fetch function which bypasses access control
        const directResult = await fetchTaskDirectly(taskId);
        console.log("Direct task fetch result:", directResult);
        
        if (directResult.success && directResult.data) {
          const taskData = directResult.data;
          setTask(taskData);
        } else {
          console.error("Failed to load task:", directResult.error);
          setError(directResult.error || "Failed to load task");
        }
      } catch (err) {
        console.error("Error fetching task details:", err);
        setError("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    if (taskId) {
      fetchTaskDetails();
    } else {
      console.error("No task ID found in URL params");
      setError("Invalid task ID");
      setIsLoading(false);
    }
  }, [taskId]);

  // Add Pusher subscription for real-time task updates
  useEffect(() => {
    if (!taskId) return;
    
    console.log("Setting up Pusher subscription for task updates:", taskId);
    
    // Subscribe to the task channel
    const channel = pusherClient.subscribe(getTaskChannel(taskId));
    
    // Listen for task update events
    channel.bind(EVENT_TYPES.TASK_UPDATED, (data: any) => {
      console.log("Task update received:", data);
      
      if (data.task && data.task.id === taskId) {
        // Update the task state with the updated task data
        setTask(prevTask => {
          if (!prevTask) return null;
          
          return {
            ...prevTask,
            ...data.task,
            status: data.task.status || prevTask.status
          };
        });
        
        // Show a toast notification about the status change if it changed
        if (data.task.status && task?.status !== data.task.status) {
          toast.info(`Task status updated to ${getStatusLabel(data.task.status)}`);
        }
      }
    });
    
    // Cleanup function
    return () => {
      channel.unbind(EVENT_TYPES.TASK_UPDATED);
      pusherClient.unsubscribe(getTaskChannel(taskId));
    };
  }, [taskId, task?.status]);

  const formatDate = (dateString: string | Date) => {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-blue-500"
      case "in_progress":
      case "in-progress":
        return "bg-yellow-500"
      case "under_review":
      case "pending-review":
        return "bg-purple-500"
      case "completed":
        return "bg-green-500"
      case "in_dispute":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "Open"
      case "in_progress":
      case "in-progress":
        return "In Progress"
      case "under_review":
      case "pending-review":
        return "Pending Review"
      case "completed":
        return "Completed"
      case "in_dispute":
        return "In Dispute"
      default:
        return status
    }
  }

  const handleSubmitTask = async () => {
    if (!task) return;
    
    try {
      setIsSubmitting(true);
      
      // Get the current user's ID from auth
      const userId = await getUserId();
      
      // Call the submission action
      const result = await createTaskSubmission(
        task.id,
        userId,
        submissionMessage,
        uploadedFiles // Pass the uploaded files
      );
      
      if (result.success) {
        // Update the local task state with the new submission
        // const newStatus = task.status === "in-progress" ? "under_review" : task.status;
        
        setTask(prevTask => {
          if (!prevTask) return null;
          
          // Add the new submission to the list
          const newSubmission = {
            id: result.data.id,
            content: submissionMessage,
            status: "pending",
            createdAt: new Date(),
            attachments: uploadedFiles
          };
          
          return {
            ...prevTask,
            status: prevTask.status === "in-progress" ? "under_review" : prevTask.status,
            submissions: [newSubmission, ...prevTask.submissions]
          };
        });
        
        // If status has changed, trigger real-time update
        if (task.status === "in-progress" || task.status === "in_progress") {
          try {
            await fetch('/api/tasks/notify-update', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                taskId: task.id,
                update: {
                  status: "UNDER_REVIEW"
                }
              }),
            });
          } catch (error) {
            console.error("Failed to trigger real-time notification:", error);
          }
        }
        
        // Reset form
        setSubmissionMessage("");
        setUploadedFiles([]);
        
        // Different messages based on whether this is the first submission or an additional one
        if (task.submissions.length === 0) {
          toast.success("Work submitted successfully! Your task is now under review.");
        } else {
          toast.success("Additional submission added successfully.");
        }
      } else {
        toast.error(result.error || "Failed to submit work");
      }
    } catch (error) {
      console.error("Error submitting work:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!task) return;
    
    try {
      setIsUpdatingStatus(true);
      // Get the current user's ID from auth
      const userId = await getUserId();
      
      const result = await updateTaskStatus(task.id, userId, newStatus);
      
      if (result.success) {
        // Update the local task object with the new status
        setTask(prevTask => {
          if (!prevTask) return null;
          return {
            ...prevTask,
            status: newStatus.toLowerCase()
          };
        });
        
        // Trigger real-time update via API endpoint to notify all clients
        try {
          await fetch('/api/tasks/notify-update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              taskId: task.id,
              update: {
                status: newStatus
              }
            }),
          });
        } catch (error) {
          console.error("Failed to trigger real-time notification:", error);
        }
        
        toast.success(result.message || `Task status updated to ${getStatusLabel(newStatus)}`);
      } else {
        toast.error(result.error || "Failed to update task status");
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("An unexpected error occurred while updating status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSubmitDispute = async () => {
    if (!task || !disputeReason.trim()) {
      toast.error("Please provide a reason for the dispute.");
      return;
    }

    try {
      setIsSubmittingDispute(true);
      
      // Get the current user's ID from auth
      const userId = await getUserId();
      
      // Call the API to create a dispute
      const response = await fetch('/api/disputes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignmentId: task.id,
          initiatorId: userId,
          reason: disputeReason,
          evidence: disputeEvidence,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update the local task status immediately without requiring a refresh
        setTask(prevTask => {
          if (!prevTask) return null;
          return {
            ...prevTask,
            status: "IN_DISPUTE",
            disputes: [
              ...(prevTask.disputes || []),
              {
                id: result.data.id || crypto.randomUUID(),
                reason: disputeReason,
                status: "OPEN",
                createdAt: new Date(),
                initiatorId: userId,
                hasResponse: false
              }
            ]
          };
        });
        
        // Trigger real-time update via API endpoint to notify all clients
        try {
          await fetch('/api/tasks/notify-update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              taskId: task.id,
              update: {
                status: "IN_DISPUTE"
              }
            }),
          });
        } catch (error) {
          console.error("Failed to trigger real-time notification:", error);
        }
        
        toast.success("Dispute submitted successfully.");
        setDisputeReason("");
        setDisputeEvidence([]);
        setActiveTab("details");
      } else {
        toast.error(result.error || "Failed to submit dispute.");
      }
    } catch (error) {
      console.error("Error submitting dispute:", error);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout navItems={doerNavItems} userRole="doer" userName="User">
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-xl">Loading task details...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !task) {
    return (
      <DashboardLayout navItems={doerNavItems} userRole="doer" userName="User">
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error || "Task not found"} 
            </AlertDescription>
          </Alert>
          <div className="mt-6">
            <Button asChild variant="default">
              <Link href="/doer/available-tasks">Browse Available Tasks</Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Check if there's an active dispute that the user can respond to
  const activeDispute = task?.status?.toLowerCase() === "in_dispute";
  const disputeDetails = task?.disputes?.find(d => d.status === "OPEN");
  const canRespondToDispute = disputeDetails && currentUserId && disputeDetails.initiatorId !== currentUserId && !disputeDetails.hasResponse;

  return (
    <DashboardLayout navItems={doerNavItems} userRole="doer" userName="User">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={task.status === "open" ? "/doer/available-tasks" : "/doer/active-tasks"}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{task.title}</h1>
          <Badge className={`${getStatusColor(task.status)} text-white ml-2`}>{getStatusLabel(task.status)}</Badge>
        </div>

        {/* Add alert for active disputes */}
        {activeDispute && (
          <Alert variant={disputeDetails?.initiatorId === currentUserId ? "default" : "destructive"} className="my-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Task In Dispute</AlertTitle>
            <AlertDescription>
              {disputeDetails?.initiatorId === currentUserId 
                ? "You have raised a dispute for this task. Waiting for admin review."
                : canRespondToDispute
                  ? "The other party has raised a dispute. Please respond below."
                  : disputeDetails?.hasResponse
                    ? "You have responded to this dispute. Waiting for admin review."
                    : "This task is in dispute. Contact admin for more information."
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Add banner for finalized tasks */}
        {isTaskFinalized && (
          <Alert variant="default" className="bg-green-50 border-green-200 my-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Task Finalized</AlertTitle>
            <AlertDescription className="text-green-700">
              {task?.status?.toLowerCase() === "completed" 
                ? "This task has been completed. You can only view the details."
                : task?.status?.toLowerCase() === "cancelled"
                  ? "This task has been cancelled. The payment has been refunded to the poster. You can only view the details."
                  : task?.payment?.status === "RELEASED"
                    ? "This task has been resolved. Payment has been released to you. You can only view the details."
                    : task?.payment?.status === "REFUNDED"
                      ? "This task has been resolved. Payment has been refunded to the poster. You can only view the details."
                      : "This task has been resolved. Payment has been processed. You can only view the details."}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-3 w-full">
          <div className="md:col-span-2 space-y-6">
            {/* If the user can respond to a dispute, show the response form */}
            {canRespondToDispute && (
              <DisputeResponseForm 
                disputeId={disputeDetails.id} 
                assignmentTitle={task.title} 
              />
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="submissions">Submissions</TabsTrigger>
                <TabsTrigger value="dispute">Raise Dispute</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Task Description</CardTitle>
                  </CardHeader>
                  <CardContent className="prose max-w-full">
                    <div dangerouslySetInnerHTML={{ __html: task.description }} />
                    
                    {/* Display attachments within the details tab */}
                    {task.attachments && Array.isArray(task.attachments) && task.attachments.length > 0 ? (
                      <div className="mt-6 space-y-2">
                        <h3 className="text-lg font-semibold">Attachments</h3>
                        <div className="space-y-2">
                          {task.attachments.map((attachment, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 border rounded-md"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span>{typeof attachment === 'string' 
                                  ? attachment.split('/').pop() 
                                  : attachment.name || attachment.url?.split('/').pop() || 'File'}</span>
                              </div>
                              <Button size="sm" variant="ghost" asChild>
                                <a 
                                  href={typeof attachment === 'string' ? attachment : attachment.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="messages" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Messages</CardTitle>
                    <CardDescription>
                      {task.bid?.status === "accepted" || task.status !== "open" 
                        ? "Communicate with the task poster" 
                        : "You can message after your bid is accepted"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activeDispute ? (
                      <div>
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            <h3 className="font-semibold text-amber-800">Messaging Restricted During Dispute</h3>
                          </div>
                          <p className="text-amber-700 text-sm">
                            You can view previous messages, but new messages cannot be sent while this task is in dispute.
                          </p>
                        </div>
                        
                        {/* Show existing messages in read-only mode */}
                        <ChatInterface
                          assignmentId={task.id}
                          receiverId={task.poster?.id || ""}
                          readOnly={true}
                        />
                      </div>
                    ) : isTaskFinalized ? (
                      <div>
                        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <h3 className="font-semibold text-green-800">Task Finalized</h3>
                          </div>
                          <p className="text-green-700 text-sm">
                            This task has been finalized. You can view previous messages, but new messages cannot be sent.
                          </p>
                        </div>
                        
                        {/* Show existing messages in read-only mode */}
                        <ChatInterface
                          assignmentId={task.id}
                          receiverId={task.poster?.id || ""}
                          readOnly={true}
                        />
                      </div>
                    ) : task.bid?.status === "accepted" || task.status !== "open" ? (
                      <ChatInterface
                        assignmentId={task.id}
                        receiverId={task.poster?.id || ""}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Messages Not Available Yet</h3>
                        <p className="text-muted-foreground max-w-md">
                          You will be able to communicate with the client once your bid has been accepted.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="submissions" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Submit Work</CardTitle>
                    <CardDescription>Submit your completed work for review</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {activeDispute ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          <h3 className="font-semibold text-amber-800">Submissions Restricted During Dispute</h3>
                        </div>
                        <p className="text-amber-700 text-sm">
                          You can view previous submissions, but new submissions cannot be added while this task is in dispute.
                        </p>
                      </div>
                    ) : isTaskFinalized ? (
                      <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <h3 className="font-semibold text-green-800">Task Finalized</h3>
                        </div>
                        <p className="text-green-700 text-sm">
                          This task has been finalized. You can view previous submissions, but new submissions cannot be added.
                        </p>
                      </div>
                    ) : task.bid?.status === "accepted" || task.status !== "open" ? (
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Add a message to the poster about your submission..."
                          rows={4}
                          value={submissionMessage}
                          onChange={(e) => setSubmissionMessage(e.target.value)}
                        />
                        <div className="bg-muted/50 p-4 rounded-md">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Paperclip className="h-4 w-4" />
                            <span>Attach files</span>
                          </div>
                          
                          {/* Display uploaded files */}
                          {uploadedFiles.length > 0 && (
                            <div className="mb-3 space-y-2">
                              {uploadedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => {
                                      setUploadedFiles(files => files.filter((_, i) => i !== index));
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Custom file upload implementation */}
                          <div className="flex flex-col gap-2">
                            <input
                              type="file"
                              id="submission-file-upload"
                              className="hidden"
                              multiple
                              onChange={(e) => {
                                // Get files from input
                                const files = e.target.files;
                                if (files && files.length > 0) {
                                  // Convert FileList to array for startUpload
                                  const fileArray = Array.from(files);
                                  setIsUploading(true);
                                  // Start the upload using the hook we added
                                  startSubmissionUpload(fileArray);
                                }
                              }}
                            />
                            <button 
                              type="button"
                              onClick={() => document.getElementById('submission-file-upload')?.click()}
                              disabled={isUploading || isSubmitting}
                              className="bg-[#171717] text-white p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full"
                            >
                              {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Paperclip className="h-4 w-4" />
                              )}
                              <span>
                                {isUploading 
                                  ? submissionUploadProgress > 0
                                    ? `Uploading (${Math.floor(submissionUploadProgress)}%)`
                                    : 'Uploading...'
                                  : 'Choose Files'}
                              </span>
                            </button>
                          </div>
                          
                          {/* Display upload progress */}
                          {isUploading && submissionUploadProgress > 0 && (
                            <div className="mt-2 space-y-2">
                              <div className="w-full space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>Upload Progress</span>
                                  <span>{Math.floor(submissionUploadProgress)}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-black" 
                                    style={{ width: `${submissionUploadProgress}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <p className="text-xs text-muted-foreground mt-2">
                            Upload any relevant files for your submission (max 5 files, 10MB each)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Allowed files: .pdf, .doc, .docx, .jpg, .jpeg, .png, .zip
                          </p>
                        </div>
                        <Button 
                          onClick={handleSubmitTask} 
                          className="w-full"
                          disabled={isSubmitting || isUploading || (!submissionMessage.trim() && uploadedFiles.length === 0)}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {task.submissions.length > 0 ? "Submit Updated Work" : "Submit for Review"}
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Submissions Not Available Yet</h3>
                        <p className="text-muted-foreground max-w-md">
                          You will be able to submit work once your bid has been accepted.
                        </p>
                      </div>
                    )}

                    {/* Show submission history */}
                    {task.submissions.length > 0 && (
                      <>
                        <Separator className="my-6" />
                        <h3 className="text-lg font-semibold mb-4">Submission History</h3>
                        <div className="space-y-4">
                          {task.submissions.map((submission) => (
                            <div key={submission.id} className="p-4 border rounded-lg">
                              <div className="flex justify-between mb-2">
                                <p className="font-semibold">Submission on {formatDate(submission.createdAt)}</p>
                              </div>
                              <p className="mb-2">{submission.content}</p>
                              {submission.attachments && submission.attachments.length > 0 && (
                                <div className="mt-2">
                                  <p className="font-semibold mb-1">Attachments:</p>
                                  <div className="space-y-1">
                                    {submission.attachments.map((attachment: any, index: number) => (
                                      <div key={index} className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-500" />
                                        <a
                                          href={attachment.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-500 hover:underline"
                                        >
                                          {attachment.name}
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dispute">
                <Card>
                  <CardHeader>
                    <CardTitle>Raise a Dispute</CardTitle>
                    <CardDescription>
                      {task.bid?.status === "accepted" || task.status !== "open" 
                        ? "If you have an issue with this task or payment, please provide details below."
                        : "You can raise disputes after your bid is accepted"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {task.bid?.status === "accepted" || task.status !== "open" ? (
                      activeDispute ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Dispute Already In Progress</h3>
                          <p className="text-muted-foreground max-w-md mb-6">
                            A dispute has already been raised for this task. For further details, please visit the Dispute page.
                          </p>
                          <Button asChild className="mt-2">
                            <Link href="/doer/disputes">
                              Go to Disputes
                            </Link>
                          </Button>
                        </div>
                      ) : isTaskFinalized ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Task Finalized</h3>
                          <p className="text-muted-foreground max-w-md mb-6">
                            This task has been finalized and cannot be disputed. If you have any concerns, please contact support.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="dispute-reason" className="text-sm font-medium mb-1 block">
                              Reason for Dispute
                            </label>
                            <Textarea
                              id="dispute-reason"
                              placeholder="Describe the issue in detail..."
                              value={disputeReason}
                              onChange={(e) => setDisputeReason(e.target.value)}
                              rows={5}
                              className="w-full"
                            />
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium mb-1 block">
                              Supporting Evidence (Optional)
                            </label>
                            <div className="flex flex-col gap-2">
                              {/* Custom file upload implementation */}
                              <div className="flex flex-col gap-2">
                                <input
                                  type="file"
                                  id="dispute-file-upload"
                                  className="hidden"
                                  multiple
                                  onChange={(e) => {
                                    // Get files from input
                                    const files = e.target.files;
                                    if (files && files.length > 0) {
                                      // Convert FileList to array for startUpload
                                      const fileArray = Array.from(files);
                                      setIsUploading(true);
                                      // Start the upload using the hook we added
                                      startDisputeUpload(fileArray);
                                    }
                                  }}
                                />
                                <button 
                                  type="button"
                                  onClick={() => document.getElementById('dispute-file-upload')?.click()}
                                  disabled={isUploading || isSubmittingDispute}
                                  className="bg-[#171717] text-white p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-fit"
                                >
                                  {isUploading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Paperclip className="h-4 w-4" />
                                  )}
                                  <span>
                                    {isUploading 
                                      ? uploadProgress > 0
                                        ? `Uploading (${Math.floor(uploadProgress)}%)`
                                        : 'Uploading...'
                                      : 'Choose Files'}
                                  </span>
                                </button>
                              </div>
                            </div>
                            
                            {/* Display upload progress */}
                            {isUploading && uploadProgress > 0 && (
                              <div className="mt-2 space-y-2">
                                <div className="w-full space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span>Upload Progress</span>
                                    <span>{Math.floor(uploadProgress)}%</span>
                                  </div>
                                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-black" 
                                      style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <p className="text-xs text-muted-foreground mt-2">
                              Upload any relevant files as evidence (max 5 files, 10MB each)
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Allowed files: .pdf, .doc, .docx, .jpg, .jpeg, .png, .zip
                            </p>
                            
                            {disputeEvidence.length > 0 && (
                              <div className="mt-4">
                                <p className="text-sm font-medium mb-2">Uploaded Files:</p>
                                <div className="space-y-2">
                                  {disputeEvidence.map((file, index) => (
                                    <div 
                                      key={index} 
                                      className="flex items-center justify-between p-2 pr-4 border rounded-lg bg-muted/30"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{file.name}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDisputeEvidence(disputeEvidence.filter((_, i) => i !== index));
                                        }}
                                        className="text-muted-foreground hover:text-destructive focus:outline-none"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Disputes Not Available Yet</h3>
                        <p className="text-muted-foreground max-w-md">
                          You will be able to raise disputes once your bid has been accepted and you&apos;ve started working on the task.
                        </p>
                      </div>
                    )}
                  </CardContent>
                  {(task.bid?.status === "accepted" || task.status !== "open") && !activeDispute && !isTaskFinalized && (
                    <CardFooter className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDisputeReason("");
                          setDisputeEvidence([]);
                          setActiveTab("details");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitDispute}
                        disabled={isSubmittingDispute || !disputeReason.trim()}
                      >
                        {isSubmittingDispute ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit Dispute"
                        )}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              </TabsContent>
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
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Rs {task.budget.toFixed(2)}</span>
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
                <div>
                  <p className="text-sm font-medium mb-2">Client</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={task.poster?.image || undefined} />
                      <AvatarFallback>{task.poster?.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{task.poster?.name || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">
                        Member since {new Date(task.poster?.memberSince || new Date()).getFullYear()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2 flex-col">
                {/* Bid Button - Show only if task is open and user hasn't placed a bid yet */}
                {task.status === "open" && !task.bid && (
                  <Button className="w-full" onClick={() => setBidDialogOpen(true)}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Place Bid
                  </Button>
                )}

                {task.bid && task.bid.status === "accepted" && (
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab("messages")}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Message Client
                  </Button>
                )}
                
                {/* Status update buttons */}
                {task.status === "assigned" && (
                  <Button 
                    className="w-full" 
                    onClick={() => handleStatusUpdate("IN_PROGRESS")}
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Clock className="mr-2 h-4 w-4" />
                    )}
                    Start Working
                  </Button>
                )}
                
                {(task.status === "in_progress" || task.status === "in-progress") && (
                  <Button className="w-full" onClick={() => setActiveTab("submissions")}>
                    Submit Work
                  </Button>
                )}
              </CardFooter>
            </Card>

            {task.bid && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Bid</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-muted-foreground">Bid Amount</p>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-green-500" />
                      <span className="font-medium">${task.bid?.amount?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                  {task.bid?.timeframe && (
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-muted-foreground">Timeframe</p>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-blue-500" />
                        <span>{task.bid.timeframe}</span>
                      </div>
                    </div>
                  )}
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-1">Bid Message</p>
                    <p className="text-sm">{task.bid?.message || ''}</p>
                  </div>
                  <div className="pt-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge
                      className={
                        task.bid?.status === "accepted"
                          ? "bg-green-500"
                          : task.bid?.status === "rejected"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }
                    >
                      {task.bid?.status || 'pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Place Bid Dialog */}
      {task && (
        <PlaceBidDialog
          open={bidDialogOpen}
          onOpenChange={setBidDialogOpen}
          taskId={task.id}
          taskTitle={task.title}
          taskBudget={task.budget}
          taskDeadline={task.deadline.toString()}
          onSubmit={async (bidData) => {
            try {
              if (!currentUserId) {
                toast.error("You must be logged in to place a bid");
                return;
              }
              
              if (!bidData.bidContent?.trim()) {
                toast.error("Please provide details for your bid");
                return;
              }
              
              if (!bidData.bidAmount || bidData.bidAmount <= 0) {
                toast.error("Please enter a valid bid amount");
                return;
              }
              
              const result = await submitBid(currentUserId, bidData.taskId, bidData.bidContent, bidData.bidAmount);
              
              if (!result || !result.success) {
                const errorMessage = result?.error || "Failed to submit bid";
                throw new Error(errorMessage);
              }
              
              toast.success("Bid submitted successfully!");
              setBidDialogOpen(false);
              
              // Update the local task object with the new bid
              setTask(prevTask => {
                if (!prevTask) return null;
                return {
                  ...prevTask,
                  bid: {
                    id: result.data.id,
                    amount: bidData.bidAmount,
                    timeframe: "",  // This could be added to the bid form if needed
                    message: bidData.bidContent,
                    status: "pending"
                  }
                };
              });
            } catch (error) {
              console.error("Error submitting bid:", error);
              toast.error(error instanceof Error ? error.message : "Failed to place bid");
              throw error;
            }
          }}
        />
      )}
    </DashboardLayout>
  )
}
