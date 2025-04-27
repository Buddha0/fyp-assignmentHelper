"use client"

import { getDisputeDetails, resolveDispute } from "@/actions/disputes"
import { getUserId } from "@/actions/utility/user-utilit"
import { adminNavItems } from "@/app/(dashboard)/navigation-config"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@clerk/nextjs"
import { ArrowLeft, Calendar, DollarSign, Download, FileText, ListChecks, Loader2, MessageSquare } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

// Admin navigation items


export default function DisputeDetail() {
  const params = useParams()
  const disputeId = params.id as string
  const { user } = useUser()
  const [dispute, setDispute] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("details")
  const [resolution, setResolution] = useState("")
  const [isResolving, setIsResolving] = useState(false)
  
  useEffect(() => {
    async function loadDisputeDetails() {
      try {
        setLoading(true)
        const result = await getDisputeDetails(disputeId)
        
        if (result.success && result.data) {
          setDispute(result.data)
        } else {
          toast.error(result.error || "Failed to load dispute details")
        }
      } catch (error) {
        console.error("Error loading dispute details:", error)
        toast.error("An error occurred while loading dispute details")
      } finally {
        setLoading(false)
      }
    }

    loadDisputeDetails()
  }, [disputeId])

  const handleResolveDispute = async (action: 'refund' | 'release') => {
    if (!dispute || !resolution.trim()) {
      toast.error("Please provide resolution notes.");
      return;
    }

    try {
      setIsResolving(true);
      
      // Get the current admin's ID
      const adminId = await getUserId();
      
      // Determine the status based on the action
      const status = action === 'refund' ? 'RESOLVED_REFUND' : 'RESOLVED_RELEASE';
      
      // Call the resolve dispute function
      const result = await resolveDispute(
        disputeId,
        adminId,
        resolution,
        status
      );

      if (result.success) {
        toast.success(`Dispute resolved. Payment ${action === 'refund' ? 'refunded to poster' : 'released to doer'}.`);
        // Update the local state
        setDispute({
          ...dispute,
          status,
          resolution,
          resolvedBy: {
            id: adminId,
            name: user?.fullName || 'Admin',
          },
        });
      } else {
        toast.error(result.error || "Failed to resolve dispute");
      }
    } catch (error) {
      console.error("Error resolving dispute:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsResolving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Open</Badge>
      case "RESOLVED_REFUND":
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Refunded</Badge>
      case "RESOLVED_RELEASE":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Released</Badge>
      case "CANCELLED":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <DashboardLayout navItems={adminNavItems} userRole="admin" userName={user?.fullName || "Admin"}>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading dispute details...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!dispute) {
    return (
      <DashboardLayout navItems={adminNavItems} userRole="admin" userName={user?.fullName || "Admin"}>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not load dispute details. The dispute may not exist or you may not have permission to view it.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  const isResolved = dispute.status !== "OPEN";

  return (
    <DashboardLayout navItems={adminNavItems} userRole="admin" userName={user?.fullName || "Admin"}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/dashboard/admin/disputes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Dispute Details</h1>
          {getStatusBadge(dispute.status)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dispute Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <p>{getStatusBadge(dispute.status)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Date Filed</h3>
                  <p>{formatDate(dispute.createdAt)} at {formatTime(dispute.createdAt)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Initiated By</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={dispute?.initiator?.image || ""} alt={dispute?.initiator?.name || "User"} />
                      <AvatarFallback>{(dispute?.initiator?.name || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{dispute?.initiator?.name || "Unknown user"}</span>
                    <Badge variant="outline" className="ml-1">
                      {dispute?.initiator?.role === "POSTER" ? "Poster" : "Doer"}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Task Information</h3>
                  <p className="font-medium mt-1">{dispute.assignment.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>${dispute.assignment.budget}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Due {formatDate(dispute.assignment.deadline)}</span>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Parties Involved</h3>
                  <div className="space-y-3 mt-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Poster:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={dispute?.assignment?.poster?.image || ""} alt={dispute?.assignment?.poster?.name || "User"} />
                          <AvatarFallback>{(dispute?.assignment?.poster?.name || "U").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{dispute?.assignment?.poster?.name || "Unknown poster"}</span>
                      </div>
                    </div>
                    
                    {dispute.assignment.doer && (
                      <div>
                        <span className="text-xs text-muted-foreground">Doer:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={dispute?.assignment?.doer?.image || ""} alt={dispute?.assignment?.doer?.name || "User"} />
                            <AvatarFallback>{(dispute?.assignment?.doer?.name || "U").charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>{dispute?.assignment?.doer?.name || "Unknown doer"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {isResolved && (
              <Card>
                <CardHeader>
                  <CardTitle>Resolution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Decision</h3>
                    <Badge variant="outline" className="mt-1">
                      {dispute.status === "RESOLVED_REFUND" ? "Refunded to Poster" : "Released to Doer"}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Resolved By</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={dispute.resolvedBy?.image || ""} alt={dispute.resolvedBy?.name || "Admin"} />
                        <AvatarFallback>{(dispute.resolvedBy?.name || "A").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{dispute.resolvedBy?.name || "Unknown admin"}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Resolution Notes</h3>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{dispute.resolution}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="md:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="details">Dispute Details</TabsTrigger>
                <TabsTrigger value="follow-ups">Follow-ups</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="submissions">Submissions</TabsTrigger>
                <TabsTrigger value="bids">Bids</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details">
                <Card>
                  <CardHeader>
                    <CardTitle>Dispute Information</CardTitle>
                    <CardDescription>
                      Filed on {formatDate(dispute.createdAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Dispute Reason</h3>
                      <Card className="overflow-hidden mb-6">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage src={dispute.initiator?.image || ""} alt={dispute.initiator?.name || "User"} />
                              <AvatarFallback>{(dispute.initiator?.name || "U").charAt(0)}</AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{dispute.initiator?.name || "Unknown user"}</span>
                                <Badge variant="outline" className="ml-1">
                                  {dispute.initiator?.role === "POSTER" ? "Poster" : "Doer"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(dispute.createdAt)} at {formatTime(dispute.createdAt)}
                                </span>
                              </div>
                              
                              <div className="mt-2 whitespace-pre-wrap text-sm">
                                {dispute.reason}
                              </div>
                              
                              {dispute.evidence && dispute.evidence.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Evidence Files</p>
                                  <div className="space-y-2">
                                    {dispute.evidence.map((file: any, index: number) => (
                                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md text-sm">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="flex-1 truncate">{file.name}</span>
                                        <a
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
                                        >
                                          <Download className="h-4 w-4" />
                                          <span className="text-xs">Download</span>
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {dispute.hasResponse ? (
                      <div className="mt-8">
                        <h3 className="text-lg font-medium mb-2">Response from {dispute.initiator.role === "POSTER" ? "Doer" : "Poster"}</h3>
                        <Card className="overflow-hidden mb-6">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-8 w-8 mt-1">
                                <AvatarImage 
                                  src={dispute.initiator.role === "POSTER" 
                                    ? dispute?.assignment?.doer?.image || "" 
                                    : dispute?.assignment?.poster?.image || ""} 
                                  alt={dispute.initiator.role === "POSTER" 
                                    ? dispute?.assignment?.doer?.name || "Doer" 
                                    : dispute?.assignment?.poster?.name || "Poster"} 
                                />
                                <AvatarFallback>
                                  {(dispute.initiator.role === "POSTER" 
                                    ? dispute?.assignment?.doer?.name || "D" 
                                    : dispute?.assignment?.poster?.name || "P").charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">
                                    {dispute.initiator.role === "POSTER" 
                                      ? dispute?.assignment?.doer?.name || "Doer" 
                                      : dispute?.assignment?.poster?.name || "Poster"}
                                  </span>
                                  <Badge variant="outline" className="ml-1">
                                    {dispute.initiator.role === "POSTER" ? "Doer" : "Poster"}
                                  </Badge>
                                </div>
                                
                                <div className="mt-2 whitespace-pre-wrap text-sm">
                                  {dispute.response}
                                </div>
                                
                                {dispute.responseEvidence && dispute.responseEvidence.length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Response Evidence</p>
                                    <div className="space-y-2">
                                      {dispute.responseEvidence.map((file: any, index: number) => (
                                        <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md text-sm">
                                          <FileText className="h-4 w-4 text-muted-foreground" />
                                          <span className="flex-1 truncate">{file.name}</span>
                                          <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
                                          >
                                            <Download className="h-4 w-4" />
                                            <span className="text-xs">Download</span>
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="mt-8 p-4 border rounded-md bg-yellow-50">
                        <h3 className="text-md font-medium mb-2">Awaiting Response</h3>
                        <p className="text-sm text-muted-foreground">
                          The other party has not yet responded to this dispute.
                        </p>
                      </div>
                    )}
                    
                    {dispute.evidence && dispute.evidence.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-sm font-medium mb-2">Dispute Evidence</h3>
                        <div className="space-y-2">
                          {dispute.evidence.map((file: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-2 border rounded">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm truncate">{file.name}</span>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto text-sm text-blue-500 hover:underline"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(!isResolved && (!dispute.hasResponse || dispute.hasResponse)) && (
                      <div className="mt-8">
                        <h3 className="text-sm font-medium mb-2">Resolution Notes</h3>
                        <Textarea
                          placeholder="Enter your decision notes and reasoning here..."
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          rows={5}
                          className="w-full"
                        />
                        
                        <div className="flex justify-between mt-4">
                          <Button 
                            variant="destructive" 
                            onClick={() => handleResolveDispute('refund')}
                            disabled={isResolving || !resolution.trim()}
                          >
                            {isResolving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Refund to Poster
                          </Button>
                          <Button 
                            variant="default" 
                            onClick={() => handleResolveDispute('release')}
                            disabled={isResolving || !resolution.trim()}
                          >
                            {isResolving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Release to Doer
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="follow-ups">
                <Card>
                  <CardHeader>
                    <CardTitle>Dispute Follow-up Messages</CardTitle>
                    <CardDescription>
                      Additional information provided by both parties
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dispute.followups && dispute.followups.length > 0 ? (
                      <div className="space-y-4">
                        {dispute.followups.map((followup: any) => (
                          <div key={followup.id} className="flex gap-3 border p-4 rounded-md">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={followup?.sender?.image || ""} alt={followup?.sender?.name || "User"} />
                              <AvatarFallback>{(followup?.sender?.name || "U").charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col w-full">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{followup?.sender?.name || "Unknown user"}</span>
                                <Badge variant="outline" className="ml-1">
                                  {followup?.sender?.role === "POSTER" ? "Poster" : 
                                   followup?.sender?.role === "DOER" ? "Doer" : "Admin"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(followup.createdAt)} at {formatTime(followup.createdAt)}
                                </span>
                              </div>
                              <div className="mt-2 text-sm whitespace-pre-wrap">{followup.message}</div>
                              {followup.evidence && followup.evidence.length > 0 && (
                                <div className="mt-4 space-y-2">
                                  <h4 className="text-sm font-medium">Evidence</h4>
                                  {followup.evidence.map((file: any, index: number) => (
                                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                                      <FileText className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm truncate">{file.name}</span>
                                      <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-auto text-sm text-blue-500 hover:underline flex items-center gap-1"
                                      >
                                        <Download className="h-4 w-4" />
                                        <span>Download</span>
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
                        <h3 className="text-lg font-medium">No follow-up messages</h3>
                        <p className="text-muted-foreground mt-1">
                          There are no follow-up messages for this dispute.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="messages">
                <Card>
                  <CardHeader>
                    <CardTitle>Task Messages</CardTitle>
                    <CardDescription>
                      Communication between poster and doer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dispute.assignment.messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
                        <h3 className="text-lg font-medium">No messages found</h3>
                        <p className="text-muted-foreground mt-1">
                          There are no messages between the poster and doer for this task.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dispute.assignment.messages.map((message: any) => (
                          <div key={message.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={message?.sender?.image || ""} alt={message?.sender?.name || "User"} />
                              <AvatarFallback>{(message?.sender?.name || "U").charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{message?.sender?.name || "Unknown user"}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(message.createdAt)} at {formatTime(message.createdAt)}
                                </span>
                              </div>
                              <div className="mt-1 text-sm whitespace-pre-wrap">{message.content}</div>
                              {message.fileUrls && message.fileUrls.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {message.fileUrls.map((file: any, index: number) => (
                                    <a
                                      key={index}
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                                    >
                                      <FileText className="h-3 w-3" />
                                      {file.name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="submissions">
                <Card>
                  <CardHeader>
                    <CardTitle>Task Submissions</CardTitle>
                    <CardDescription>
                      Work submitted by the doer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dispute.assignment.submissions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                        <h3 className="text-lg font-medium">No submissions found</h3>
                        <p className="text-muted-foreground mt-1">
                          The doer has not made any submissions for this task.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {dispute.assignment.submissions.map((submission: any) => (
                          <div key={submission.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={submission?.user?.image || ""} alt={submission?.user?.name || "User"} />
                                  <AvatarFallback>{(submission?.user?.name || "U").charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{submission?.user?.name || "Unknown doer"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={
                                  submission.status === "approved" ? "bg-green-100 text-green-800 border-green-300" :
                                  submission.status === "rejected" ? "bg-red-100 text-red-800 border-red-300" :
                                  "bg-yellow-100 text-yellow-800 border-yellow-300"
                                }>
                                  {submission.status === "approved" ? "Approved" :
                                  submission.status === "rejected" ? "Rejected" : "Pending"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(submission.createdAt)}
                                </span>
                              </div>
                            </div>
                            <div className="whitespace-pre-wrap">{submission.content}</div>
                            
                            {submission.attachments && submission.attachments.length > 0 && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium mb-2">Attachments</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {submission.attachments.map((file: any, index: number) => (
                                    <a
                                      key={index}
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50"
                                    >
                                      <FileText className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm truncate">{file.name}</span>
                                      <Download className="h-4 w-4 ml-auto" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="bids">
                <Card>
                  <CardHeader>
                    <CardTitle>Task Bids</CardTitle>
                    <CardDescription>
                      Bids placed on this task
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dispute.assignment.bids.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <ListChecks className="h-12 w-12 text-muted-foreground mb-3" />
                        <h3 className="text-lg font-medium">No bids found</h3>
                        <p className="text-muted-foreground mt-1">
                          No doers have placed bids on this task.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dispute.assignment.bids.map((bid: any) => (
                          <div key={bid.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={bid?.user?.image || ""} alt={bid?.user?.name || "User"} />
                                  <AvatarFallback>{(bid?.user?.name || "U").charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{bid?.user?.name || "Unknown doer"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={
                                  bid.status === "accepted" ? "bg-green-100 text-green-800 border-green-300" :
                                  bid.status === "rejected" ? "bg-red-100 text-red-800 border-red-300" :
                                  "bg-yellow-100 text-yellow-800 border-yellow-300"
                                }>
                                  {bid.status === "accepted" ? "Accepted" :
                                  bid.status === "rejected" ? "Rejected" : "Pending"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  ${bid.bidAmount}
                                </span>
                              </div>
                            </div>
                            <div className="whitespace-pre-wrap">{bid.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 