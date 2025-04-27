"use client"

import { adminNavItems } from "@/app/(dashboard)/navigation-config"
import { getAllDisputes } from "@/actions/disputes"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUser } from "@clerk/nextjs"
import { FileWarning } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"



interface Dispute {
  id: string
  reason: string
  status: string
  createdAt: Date
  assignment: {
    id: string
    title: string
    poster: {
      id: string
      name: string | null
    }
    doer: {
      id: string
      name: string | null
    } | null
  }
  initiator: {
    id: string
    name: string | null
    role: string
  }
}

export default function DisputesPage() {
  const { user } = useUser()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [debugData, setDebugData] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [forceMode, setForceMode] = useState(false)

  useEffect(() => {
    async function loadDisputes() {
      try {
        setLoading(true)
        setError(null)
        
        console.log(`Fetching disputes (force mode: ${forceMode})...`)
        const result = await getAllDisputes(forceMode)
        
        if (result.success && result.data) {
          console.log("Disputes fetched successfully:", result.data)
          
          if (result.data.length === 0) {
            console.log("Warning: No disputes returned from the database")
          }
          
          setDisputes(result.data)
        } else {
          console.error("Failed to load disputes:", result.error)
          setError(result.error || "Failed to load disputes")
          toast.error("Failed to load disputes: " + (result.error || "Unknown error"))
        }
      } catch (error) {
        console.error("Error loading disputes:", error)
        setError("An unexpected error occurred")
        toast.error("An error occurred while loading disputes")
      } finally {
        setLoading(false)
      }
    }

    loadDisputes()
  }, [forceMode])

  // Debug function
  const handleDebug = async () => {
    try {
      const response = await fetch('/api/admin/debug/disputes');
      const result = await response.json();
      
      if (result.success) {
        setDebugData(result.data);
        setShowDebug(true);
        console.log("Debug data:", result.data);
      } else {
        toast.error("Debug failed: " + result.error);
      }
    } catch (error) {
      console.error("Debug error:", error);
      toast.error("Failed to fetch debug data");
    }
  };

  // Add this new function after the handleDebug function
  const handleFixIssues = async () => {
    try {
      if (!confirm("This will attempt to fix issues with dispute data. Continue?")) {
        return;
      }
      
      toast.info("Fixing dispute data issues...");
      
      const response = await fetch('/api/admin/debug/fix-disputes', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Dispute data fixed. Reloading...");
        console.log("Fix results:", result);
        
        // Reload the disputes data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error("Fix failed: " + result.error);
      }
    } catch (error) {
      console.error("Fix error:", error);
      toast.error("Failed to fix dispute data");
    }
  };

  const handleForceLoad = () => {
    setForceMode(true);
    toast.info("Loading all disputes without filtering...");
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

  const filteredDisputes = disputes.filter(dispute => {
    if (activeTab === "all") return true
    if (activeTab === "open") return dispute.status === "OPEN"
    if (activeTab === "resolved") return dispute.status.startsWith("RESOLVED")
    return false
  })

  return (
    <DashboardLayout navItems={adminNavItems} userRole="admin" userName={user?.fullName || "Admin"}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dispute Management</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleForceLoad} 
              className={forceMode ? "bg-yellow-100" : ""}
            >
              Force Load All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDebug}
            >
              Debug
            </Button>
          </div>
        </div>

        {showDebug && debugData && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Debug Information</span>
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleFixIssues}
                  >
                    Fix Issues
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowDebug(false)}
                  >
                    Close
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Raw Disputes: {debugData.disputes?.length || 0}</h3>
                  <pre className="bg-slate-100 p-2 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(debugData.disputes, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Related Payments: {debugData.payments?.length || 0}</h3>
                  <pre className="bg-slate-100 p-2 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(debugData.payments, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Related Assignments: {debugData.assignments?.length || 0}</h3>
                  <pre className="bg-slate-100 p-2 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(debugData.assignments, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Disputes</TabsTrigger>
            <TabsTrigger value="open">Open Disputes</TabsTrigger>
            <TabsTrigger value="resolved">Resolved Disputes</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === "all" ? "All Disputes" : 
                   activeTab === "open" ? "Open Disputes" : "Resolved Disputes"}
                </CardTitle>
                <CardDescription>
                  {activeTab === "all" ? "View all task disputes in the system" : 
                   activeTab === "open" ? "Disputes that require your attention" : "Previously resolved disputes"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <FileWarning className="h-12 w-12 text-red-500 mb-3" />
                    <h3 className="text-lg font-medium">Error Loading Disputes</h3>
                    <p className="text-muted-foreground mt-1">
                      {error}
                    </p>
                    <Button 
                      className="mt-4" 
                      onClick={() => window.location.reload()}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : filteredDisputes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <FileWarning className="h-12 w-12 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-medium">No disputes found</h3>
                    <p className="text-muted-foreground mt-1">
                      {activeTab === "all" ? "There are no disputes in the system yet." : 
                       activeTab === "open" ? "There are no open disputes that need attention." : 
                       "There are no resolved disputes to display."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredDisputes.map((dispute) => (
                      <div
                        key={dispute.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-lg mb-1 truncate">
                              <Link href={`/dashboard/admin/disputes/${dispute.id}`} className="hover:underline">
                                {dispute.assignment.title}
                              </Link>
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              Opened {new Date(dispute.createdAt).toLocaleDateString()} by{' '}
                              <span className="font-medium">
                                {dispute.initiator.name || 'Unknown user'} ({dispute.initiator.role === 'POSTER' ? 'Poster' : 'Doer'})
                              </span>
                            </p>
                            <div className="flex gap-2 items-center mb-4">
                              {getStatusBadge(dispute.status)}
                            </div>
                            <p className="text-sm line-clamp-2">{dispute.reason}</p>
                          </div>
                          
                          <div className="flex items-center">
                            <Button asChild size="sm" className="ml-2">
                              <Link href={`/dashboard/admin/disputes/${dispute.id}`}>
                                Review Dispute
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
} 