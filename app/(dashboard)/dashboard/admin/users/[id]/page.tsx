"use client"

import { getUserDetails } from "@/actions/admin-users"
import { adminNavItems } from "@/app/(dashboard)/navigation-config"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@clerk/nextjs"
import { format } from "date-fns"
import { ArrowLeft, Ban, Loader2, MessageSquare, Star, UserCheck, UserX } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function UserDetailPage() {
  const { user } = useUser()
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  
  // State
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [banReason, setBanReason] = useState("")
  const [isBanning, setIsBanning] = useState(false)
  
  // Fetch user data
  useEffect(() => {
    async function fetchUserDetails() {
      if (!userId) return
      
      try {
        setLoading(true)
        const result = await getUserDetails(userId)
        
        if (result.success) {
          setUserData(result.data)
        } else {
          toast.error(result.error || "Failed to load user details")
        }
      } catch (error) {
        console.error("Error loading user details:", error)
        toast.error("Failed to load user details")
      } finally {
        setLoading(false)
      }
    }
    
    fetchUserDetails()
  }, [userId])
  
  // Handle banning user
  const handleBanUser = async () => {
    if (!banReason.trim()) {
      toast.error("Please provide a reason for banning this user")
      return
    }
    
    setIsBanning(true)
    
    try {
      const response = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          reason: banReason
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success("User banned successfully")
        setBanDialogOpen(false)
        
        // Update local user data
        setUserData(prev => ({ ...prev, isBanned: true, banReason }))
      } else {
        toast.error(data.error || "Failed to ban user")
      }
    } catch (error) {
      console.error("Error banning user:", error)
      toast.error("Failed to ban user")
    } finally {
      setIsBanning(false)
    }
  }
  
  // Handle unbanning user
  const handleUnbanUser = async () => {
    try {
      const response = await fetch("/api/admin/users/unban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success("User unbanned successfully")
        
        // Update local user data
        setUserData(prev => ({ ...prev, isBanned: false, banReason: null }))
      } else {
        toast.error(data.error || "Failed to unban user")
      }
    } catch (error) {
      console.error("Error unbanning user:", error)
      toast.error("Failed to unban user")
    }
  }
  
  // Get verification status badge
  const getVerificationBadge = (status: string | null) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500">Verified</Badge>
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>
    }
  }

  return (
    <DashboardLayout navItems={adminNavItems} userRole="admin" userName={user?.fullName || "Admin"}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">User Details</h1>
        </div>
        
        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !userData ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <UserX className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">User Not Found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The user you are looking for does not exist or you don't have permission to view it.
              </p>
              <Button onClick={() => router.push("/dashboard/admin/users")} className="mt-4">
                Back to Users
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* User Profile Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={userData.image || undefined} />
                      <AvatarFallback className="text-2xl">
                        {userData.name?.charAt(0) || userData.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    
                    {userData.isBanned && (
                      <Badge variant="destructive" className="mt-2">
                        BANNED
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">{userData.name || "Anonymous User"}</h2>
                        <p className="text-muted-foreground">{userData.email || "No email"}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/dashboard/admin/support?userId=${userData.id}`}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Message
                          </Link>
                        </Button>
                        
                        {userData.isBanned ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUnbanUser}
                          >
                            <UserCheck className="mr-2 h-4 w-4 text-green-500" />
                            Unban User
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setBanDialogOpen(true)}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Ban User
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Account Details</h3>
                        <dl className="space-y-2">
                          <div className="flex items-center justify-between">
                            <dt className="text-sm">User ID</dt>
                            <dd className="text-sm font-medium">{userData.id}</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-sm">Role</dt>
                            <dd>
                              <Badge className={
                                userData.role === "ADMIN" ? "bg-purple-500" :
                                userData.role === "POSTER" ? "bg-blue-500" : "bg-green-500"
                              }>
                                {userData.role}
                              </Badge>
                            </dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-sm">Rating</dt>
                            <dd className="flex items-center">
                              <Star className="mr-1 h-4 w-4 text-yellow-500" />
                              <span className="text-sm font-medium">
                                {userData.rating?.toFixed(1) || "No Rating"}
                              </span>
                            </dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-sm">Joined</dt>
                            <dd className="text-sm font-medium">
                              {format(new Date(userData.createdAt), "PPP")}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-sm">Verification</dt>
                            <dd>
                              {getVerificationBadge(userData.verificationStatus)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Activity Summary</h3>
                        <dl className="space-y-2">
                          <div className="flex items-center justify-between">
                            <dt className="text-sm">Posted Tasks</dt>
                            <dd className="text-sm font-medium">{userData._count.postedAssignments}</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-sm">Completed Tasks</dt>
                            <dd className="text-sm font-medium">{userData._count.acceptedAssignments}</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-sm">Reviews Given</dt>
                            <dd className="text-sm font-medium">{userData._count.reviews}</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-sm">Reviews Received</dt>
                            <dd className="text-sm font-medium">{userData._count.receivedReviews}</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-sm">Bids</dt>
                            <dd className="text-sm font-medium">{userData._count.bids}</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-sm">Disputes</dt>
                            <dd className="text-sm font-medium">{userData._count.disputes}</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-sm">Support Inquiries</dt>
                            <dd className="text-sm font-medium">{userData._count.supportSessions}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Bio/Skills Section */}
            <Card>
              <CardHeader>
                <CardTitle>Bio & Skills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Bio</h3>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {userData.bio || "This user has not added a bio."}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Skills</h3>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {userData.skills || "This user has not added any skills."}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Ban Reason (if banned) */}
            {userData.isBanned && userData.banReason && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-red-700 flex items-center">
                    <Ban className="mr-2 h-5 w-5" />
                    Ban Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-800">{userData.banReason}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      
      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Ban className="mr-2 h-5 w-5 text-red-500" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              This action will prevent the user from accessing the platform. They will be notified of the ban.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="ban-reason" className="text-sm font-medium">
                Reason for ban <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="ban-reason"
                placeholder="Explain why this user is being banned..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                This reason will be shown to the user and recorded for administrative purposes.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)} disabled={isBanning}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBanUser} 
              disabled={isBanning || !banReason.trim()}
            >
              {isBanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Banning...
                </>
              ) : (
                "Ban User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
} 