"use client"

import { getUserDisputes } from "@/actions/disputes";
import { getUserId } from "@/actions/utility/user-utilit";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import { FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { posterNavItems } from "../../navigation-config";



export default function PosterDisputesPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    async function fetchDisputes() {
      try {
        setLoading(true);
        const userId = await getUserId();
        const result = await getUserDisputes(userId);
        
        if (result.success) {
          setDisputes(result.data);
        } else {
          toast.error(result.error || "Failed to load disputes");
        }
      } catch (error) {
        console.error("Error loading disputes:", error);
        toast.error("An error occurred while loading disputes");
      } finally {
        setLoading(false);
      }
    }

    fetchDisputes();
  }, []);

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

  const filteredDisputes = disputes.filter(dispute => {
    if (activeTab === "all") return true;
    if (activeTab === "needsResponse") return dispute.needsResponse;
    if (activeTab === "open") return dispute.status === "OPEN";
    if (activeTab === "resolved") return dispute.status === "RESOLVED_REFUND" || dispute.status === "RESOLVED_RELEASE";
    return true;
  });

  return (
    <DashboardLayout navItems={posterNavItems} userRole="poster" userName={user?.fullName || "User"}>
      <div className="flex flex-col gap-6 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Disputes</h1>
          <p className="text-muted-foreground">
            View and manage disputes for your assignments
          </p>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full md:w-[600px]">
            <TabsTrigger value="all">All Disputes</TabsTrigger>
            <TabsTrigger value="needsResponse" className="relative">
              Needs Response
              {disputes.filter(d => d.needsResponse).length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                  {disputes.filter(d => d.needsResponse).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading disputes...</p>
                </div>
              </div>
            ) : filteredDisputes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No disputes found</h3>
                <p className="text-muted-foreground mt-1 max-w-md">
                  {activeTab === "needsResponse" 
                    ? "You don't have any disputes that need your response."
                    : activeTab === "open" 
                    ? "You don't have any open disputes at the moment."
                    : activeTab === "resolved" 
                    ? "You don't have any resolved disputes yet."
                    : "You don't have any disputes yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDisputes.map((dispute) => (
                  <Card key={dispute.id} className={dispute.needsResponse ? "border-red-300" : ""}>
                    <CardHeader className="relative pb-2">
                      {dispute.needsResponse && (
                        <div className="absolute right-4 top-4">
                          <Badge className="bg-red-500 text-white hover:bg-red-600">Response Required</Badge>
                        </div>
                      )}
                      <CardTitle className="truncate text-base">
                        {dispute.assignment.title}
                      </CardTitle>
                      <CardDescription>
                        Filed on {formatDate(dispute.createdAt)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Status:</span>
                          <span>{getStatusBadge(dispute.status)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Role:</span>
                          <span className="text-sm">
                            {dispute.isInitiator ? "Initiator" : "Respondent"}
                          </span>
                        </div>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-medium mb-1">Reason:</h4>
                          <p className="text-sm line-clamp-2">{dispute.reason}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" asChild>
                        <Link href={`/poster/disputes/${dispute.id}`}>
                          {dispute.needsResponse ? "Respond Now" : "View Details"}
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 