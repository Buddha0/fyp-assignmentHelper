import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, DollarSign, FileText, MessageSquare, Paperclip } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { TaskStatus } from "@/types/doer-dashboard"

export interface TaskCardProps {
  id: string
  title: string
  description: string
  category: string
  budget: number
  deadline: string | Date
  status: TaskStatus
  progress?: number
  bidsCount?: number
  doerName?: string
  posterName?: string
  messagesCount?: number
  viewType?: "poster" | "doer" | "admin"
  onPlaceBid?: () => void
  onViewDetails?: () => void
  attachments?: any
  userHasBid?: boolean
}

export function TaskCard({
  id,
  title,
  description,
  category,
  budget,
  deadline,
  status,
  bidsCount = 0,
  doerName,
  posterName,
  messagesCount = 0,
  viewType = "poster",
  onPlaceBid,
  onViewDetails,
  attachments,
  userHasBid = false,
}: TaskCardProps) {
  const router = useRouter()
  
  const statusColors: Record<TaskStatus, string> = {
    open: "bg-blue-500",
    "in-progress": "bg-yellow-500",
    completed: "bg-green-500",
    "pending-review": "bg-purple-500",
    assigned: "bg-indigo-500",
    cancelled: "bg-red-500",
    "in-dispute": "bg-red-500",
  }

  const statusLabels: Record<TaskStatus, string> = {
    open: "Open",
    "in-progress": "In Progress",
    completed: "Completed",
    "pending-review": "Pending Review",
    assigned: "Assigned",
    cancelled: "Cancelled",
    "in-dispute": "In Dispute",
  }

  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline)
  const isDeadlineSoon = deadlineDate.getTime() - Date.now() < 86400000 * 3 // 3 days

  const handleViewDetails = () => {
    // If a custom handler is provided, use it
    if (onViewDetails) {
            onViewDetails();
      return;
    }
    
    // Otherwise use the default behavior
    // Ensure we have a valid ID
    if (!id) {
      console.error("Task ID is missing");
      toast.error("Task ID is missing");
      return;
    }
    
   
    
        
    const route = viewType === "poster" 
      ? `/poster/tasks/${id}` 
      : viewType === "doer" 
        ? `/doer/tasks/${id}` 
        : `/admin/tasks/${id}`;
    
        router.push(route);
    
    const viewAction = viewType === "poster" 
      ? "Viewing your task details" 
      : viewType === "doer" 
        ? `Viewing task from ${posterName || 'poster'}`
        : "Managing task";
        
    toast.info(viewAction, {
      description: title
    });
  }

  const handlePlaceBid = () => {
    if (onPlaceBid) {
      onPlaceBid()
    } else {
      router.push(`/doer/tasks/${id}`)
      toast.info("Opening bid form", {
        description: `Preparing to place bid on "${title}"`
      })
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="line-clamp-1">{title}</CardTitle>
            <CardDescription className="flex items-center gap-1 text-sm">
              <FileText className="h-3 w-3" /> {category}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={statusColors[status] + " text-white"}>{statusLabels[status]}</Badge>
            {userHasBid && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Bid Already Placed</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{description}</p>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span>Rs. {budget.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className={`h-3 w-3 ${isDeadlineSoon ? "text-red-500" : "text-muted-foreground"}`} />
            <span className={isDeadlineSoon ? "text-red-500" : ""}>{deadlineDate.toLocaleDateString()}</span>
          </div>
        </div>

        {messagesCount > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>{messagesCount} messages</span>
          </div>
        )}
        
        {attachments && Array.isArray(attachments) && attachments.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            <span>{attachments.length} attachment{attachments.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t pt-3">
        {viewType === "poster" && (
          <>
            {status === "open" ? (
              <div className="text-xs text-muted-foreground">{bidsCount} bids</div>
            ) : (
              <div className="text-xs text-muted-foreground">Assigned to {doerName || "a doer"}</div>
            )}
            <Button size="sm" onClick={handleViewDetails}>View Details</Button>
          </>
        )}

        {viewType === "doer" && (
          <>
            {status === "open" ? (
              <Button variant="outline" size="sm" onClick={handlePlaceBid}>
                Place Bid
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground">You&apos;re working on this task</div>
            )}
            <Button size="sm" onClick={handleViewDetails}>View Details</Button>
          </>
        )}

        {viewType === "admin" && (
          <>
            <div className="text-xs text-muted-foreground">
              {status === "open" ? `${bidsCount} bids` : `Assigned to ${doerName || "a doer"}`}
            </div>
            <Button size="sm" onClick={handleViewDetails}>Manage</Button>
          </>
        )}
      </CardFooter>
    </Card>
  )
}

