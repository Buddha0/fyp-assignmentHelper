"use client"

import { getUserId } from "@/actions/utility/user-utilit";
import { doerNavItems } from "@/app/(dashboard)/navigation-config";
import { getDisputeDetails } from "@/actions/disputes";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DisputeResponseForm } from "@/components/dispute/dispute-response-form";
import { DisputeFollowupForm } from "@/components/dispute/dispute-followup-form";
import { DisputeFollowupList } from "@/components/dispute/dispute-followup-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import { AlertTriangle, ArrowLeft, Calendar, DollarSign, Download, FileText, Loader2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function DoerDisputeDetail() {
  const params = useParams();
  const disputeId = params.id as string;
  const { user } = useUser();
  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canRespond, setCanRespond] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  
  useEffect(() => {
    async function fetchDisputeData() {
      try {
        setLoading(true);
        const currentUserId = await getUserId();
        setUserId(currentUserId);
        
        const result = await getDisputeDetails(disputeId);
        
        if (result.success && result.data) {
          setDispute(result.data);
          
          // Check if user can respond to this dispute
          const isInitiator = result.data.initiatorId === currentUserId;
          const isResolved = result.data.status !== "OPEN";
          const hasResponded = (result.data as any).hasResponse;
          
          // User can respond if they are not the initiator, dispute is open, and they haven't responded yet
          setCanRespond(!isInitiator && !isResolved && !hasResponded);
        } else {
          toast.error(result.error || "Failed to load dispute details");
        }
      } catch (error) {
        console.error("Error loading dispute:", error);
        toast.error("An error occurred while loading dispute details");
      } finally {
        setLoading(false);
      }
    }

    fetchDisputeData();
  }, [disputeId]);

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

  if (loading) {
    return (
      <DashboardLayout navItems={doerNavItems} userRole="doer" userName={user?.fullName || "User"}>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading dispute details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!dispute) {
    return (
      <DashboardLayout navItems={doerNavItems} userRole="doer" userName={user?.fullName || "User"}>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button asChild variant="outline" size="icon">
              <Link href="/doer/disputes">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Dispute Not Found</h1>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center py-8">
                <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-medium mb-2">Dispute Not Found</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  The dispute you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
                </p>
                <Button asChild>
                  <Link href="/doer/disputes">
                    Back to Disputes
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={doerNavItems} userRole="doer" userName={user?.fullName || "User"}>
      <div className="flex flex-col gap-6 p-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/doer/disputes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Dispute Details</h1>
            <p className="text-muted-foreground">
              Regarding Task: {dispute.assignment.title}
            </p>
          </div>
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
                  <p>{formatDate(dispute.createdAt)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Initiated By</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={dispute.initiator.image || ""} alt={dispute.initiator.name || "User"} />
                      <AvatarFallback>{(dispute.initiator.name || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{dispute.initiator.name || "Unknown user"}</span>
                  </div>
                </div>
                <Separator />
                
                {dispute.status !== "OPEN" && dispute.resolvedBy && (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Resolution</h3>
                      <div className="mt-1">
                        <Badge variant="outline" className={
                          dispute.status === "RESOLVED_REFUND" 
                          ? "bg-red-100 text-red-800 border-red-300" 
                          : "bg-green-100 text-green-800 border-green-300"
                        }>
                          {dispute.status === "RESOLVED_REFUND" ? "Refunded to Poster" : "Released to Doer"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Resolved By</h3>
                      <p className="mt-1">{dispute.resolvedBy.name || "Admin"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Resolution Notes</h3>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{dispute.resolution}</p>
                    </div>
                    <Separator />
                  </>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Assignment Details</h3>
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
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2 space-y-6">
            <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="details">Dispute Details</TabsTrigger>
                <TabsTrigger value="messages">Task Messages</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="mt-6">
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle>Dispute Information</CardTitle>
                      <CardDescription>Filed on {formatDate(dispute.createdAt)}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-md font-medium mb-2">Dispute Reason</h3>
                      <Card className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage src={dispute.initiator.image || ""} alt={dispute.initiator.name || "User"} />
                              <AvatarFallback>{(dispute.initiator.name || "U").charAt(0)}</AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {dispute.initiator.id === userId ? "You" : dispute.initiator.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(dispute.createdAt)}
                                  </span>
                                </div>
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
                    
                    {(dispute as any).hasResponse ? (
                      <div>
                        <h3 className="text-md font-medium mb-2">Response</h3>
                        <Card className={`overflow-hidden ${userId === dispute.initiatorId ? "" : "border-l-4 border-l-blue-500"}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-8 w-8 mt-1">
                                <AvatarImage 
                                  src={userId === dispute.initiatorId
                                    ? (dispute.assignment.doer?.image || "") 
                                    : (dispute.assignment.poster?.image || "")} 
                                  alt={userId === dispute.initiatorId
                                    ? (dispute.assignment.doer?.name || "User") 
                                    : (dispute.assignment.poster?.name || "User")} 
                                />
                                <AvatarFallback>
                                  {userId === dispute.initiatorId
                                    ? (dispute.assignment.doer?.name || "U").charAt(0)
                                    : (dispute.assignment.poster?.name || "U").charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {userId === dispute.initiatorId 
                                        ? (dispute.assignment.doer?.name || "Doer") 
                                        : "You"}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="mt-2 whitespace-pre-wrap text-sm">
                                  {dispute.response}
                                </div>
                                
                                {dispute.responseEvidence && dispute.responseEvidence.length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Evidence Files</p>
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

                        {/* Show follow-up messages if any */}
                        {dispute.followups && dispute.followups.length > 0 && (
                          <DisputeFollowupList 
                            followups={dispute.followups}
                            currentUserId={userId || ''}
                          />
                        )}
                        
                        {/* Show follow-up form if user has already responded and dispute is still open */}
                        {dispute.status === "OPEN" && (
                          <DisputeFollowupForm 
                            disputeId={disputeId} 
                            assignmentTitle={dispute.assignment.title} 
                          />
                        )}
                      </div>
                    ) : canRespond ? (
                      <DisputeResponseForm 
                        disputeId={disputeId} 
                        assignmentTitle={dispute.assignment.title} 
                      />
                    ) : userId === dispute.initiatorId ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <h3 className="text-md font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          Awaiting Response
                        </h3>
                        <p className="text-sm">
                          You initiated this dispute. The other party has been notified and may provide their response.
                          An admin will review the dispute and make a decision once both sides have been heard.
                        </p>
                        
                        {/* Show follow-up messages if any */}
                        {dispute.followups && dispute.followups.length > 0 && (
                          <DisputeFollowupList 
                            followups={dispute.followups}
                            currentUserId={userId || ''}
                          />
                        )}
                        
                        {/* Show follow-up form if dispute is still open */}
                        {dispute.status === "OPEN" && (
                          <DisputeFollowupForm 
                            disputeId={disputeId} 
                            assignmentTitle={dispute.assignment.title} 
                          />
                        )}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <h3 className="text-md font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          No Response Required
                        </h3>
                        <p className="text-sm">
                          This dispute is currently being reviewed by an admin. No response is required from you at this time.
                        </p>
                        
                        {/* Show follow-up messages if any */}
                        {dispute.followups && dispute.followups.length > 0 && (
                          <DisputeFollowupList 
                            followups={dispute.followups}
                            currentUserId={userId || ''}
                          />
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="messages" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Task Messages</CardTitle>
                    <CardDescription>Communication regarding this task</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dispute.assignment.messages && dispute.assignment.messages.length > 0 ? (
                      <div className="space-y-4">
                        {dispute.assignment.messages
                          // Filter to only show direct messages between poster and doer
                          .filter((message: any) => 
                            // Check if sender is either poster or doer
                            (message.senderId === dispute.assignment.posterId || 
                             message.senderId === dispute.assignment.doerId) &&
                            // Check if receiver is either poster or doer
                            (message.receiverId === dispute.assignment.posterId || 
                             message.receiverId === dispute.assignment.doerId)
                          )
                          .map((message: any) => (
                          <div key={message.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={message.sender.image || ""} alt={message.sender.name || "User"} />
                              <AvatarFallback>{(message.sender.name || "U").charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{message.sender.name || "Unknown user"}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(message.createdAt)}
                                </span>
                              </div>
                              <div className="mt-1 text-sm">{message.content}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
                        <h3 className="text-lg font-medium">No messages found</h3>
                        <p className="text-muted-foreground mt-1 max-w-md">
                          There are no messages related to this task.
                        </p>
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
  );
} 