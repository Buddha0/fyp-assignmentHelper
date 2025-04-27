"use client"

import { getPendingVerifications, getRejectedUsers, getVerifiedUsers, verifyUser } from "@/actions/verify-user"
import { adminNavItems } from "@/app/(dashboard)/navigation-config"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@clerk/nextjs"
import { Check, ChevronLeft, ChevronRight, Eye, X } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"



interface UserData {
  id: string
  name: string | null
  email: string | null
  role: string
  citizenshipPhotos: string[] | null
  verificationStatus: string | null
  rejectionReason?: string | null
  createdAt: Date
}

export default function VerificationPage() {
  const { user } = useUser()
  const [pendingUsers, setPendingUsers] = useState<UserData[]>([])
  const [verifiedUsers, setVerifiedUsers] = useState<UserData[]>([])
  const [rejectedUsers, setRejectedUsers] = useState<UserData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("pending")
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [photoIndices, setPhotoIndices] = useState<Record<string, number>>({})

  // Function to handle photo navigation
  const navigatePhoto = (userId: string, direction: 'next' | 'prev', maxPhotos: number) => {
    setPhotoIndices(prev => {
      const currentIndex = prev[userId] || 0;
      let newIndex;
      
      if (direction === 'next') {
        newIndex = (currentIndex + 1) % maxPhotos;
      } else {
        newIndex = (currentIndex - 1 + maxPhotos) % maxPhotos;
      }
      
      return {
        ...prev,
        [userId]: newIndex
      };
    });
  };

  // Get current photo index for a user
  const getCurrentPhotoIndex = (userId: string) => {
    return photoIndices[userId] || 0;
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // Fetch the appropriate user list based on active tab
      if (activeTab === "pending") {
        const result = await getPendingVerifications()
        if (result.success) {
          setPendingUsers(result.data || [])
        } else {
          toast.error(result.error || "Failed to fetch pending verifications")
        }
      } else if (activeTab === "verified") {
        const result = await getVerifiedUsers()
        if (result.success) {
          setVerifiedUsers(result.data || [])
        } else {
          toast.error(result.error || "Failed to fetch verified users")
        }
      } else if (activeTab === "rejected") {
        const result = await getRejectedUsers()
        if (result.success) {
          setRejectedUsers(result.data || [])
        } else {
          toast.error(result.error || "Failed to fetch rejected users")
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to fetch user data")
    } finally {
      setIsLoading(false)
    }
  }, [activeTab]);

  // Fetch initial data
  useEffect(() => {
    fetchUsers();
  }, [activeTab, fetchUsers]);

  // Handle verification status change
  const handleVerification = async (userId: string, status: "verified" | "rejected", reason?: string) => {
    try {
      // Prepare verification parameters
      const verificationParams = {
        userId, 
        status,
        ...(status === "rejected" && reason ? { rejectionReason: reason } : {})
      }
      
      const result = await verifyUser(verificationParams)
      
      if (result.success) {
        // Remove user from pending list
        setPendingUsers(prev => prev.filter(user => user.id !== userId))
        toast.success(`User ${status === "verified" ? "verified" : "rejected"} successfully`)
        
        // Refresh the active tab data
        fetchUsers()
      } else {
        toast.error(result.error || "Failed to update verification status")
      }
    } catch (error) {
      console.error("Error updating verification status:", error)
      toast.error("An error occurred while updating verification status")
    }
  }

  // Handle rejection with reason
  const handleOpenRejectionDialog = (userId: string) => {
    setSelectedUserId(userId)
    setRejectionReason("")
    setRejectionDialogOpen(true)
  }

  const handleRejectWithReason = () => {
    if (selectedUserId) {
      handleVerification(selectedUserId, "rejected", rejectionReason)
      setRejectionDialogOpen(false)
      setSelectedUserId(null)
      setRejectionReason("")
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  // Render user photos with navigation
  const renderUserPhotos = (user: UserData) => {
    if (!user.citizenshipPhotos || user.citizenshipPhotos.length === 0) {
      return (
        <p className="text-sm text-muted-foreground mb-4">No citizenship documents uploaded</p>
      );
    }

    const currentIndex = getCurrentPhotoIndex(user.id);
    const photos = user.citizenshipPhotos;

    return (
      <div className="mb-4">
        <div className="aspect-video relative rounded-md overflow-hidden border">
          <Image 
            src={photos[currentIndex]} 
            alt="Citizenship document"
            fill
            className="object-cover"
          />
          <Button 
            variant="outline" 
            size="icon" 
            className="absolute top-2 right-2 bg-white/70 hover:bg-white z-10"
            onClick={() => window.open(photos[currentIndex], '_blank')}
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          {photos.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between px-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full bg-white/70 hover:bg-white/90"
                onClick={() => navigatePhoto(user.id, 'prev', photos.length)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full bg-white/70 hover:bg-white/90" 
                onClick={() => navigatePhoto(user.id, 'next', photos.length)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        {photos.length > 1 && (
          <div className="flex justify-center items-center mt-2 space-x-1">
            <span className="text-xs text-muted-foreground">
              Document {currentIndex + 1} of {photos.length}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout navItems={adminNavItems} userRole="admin" userName={user?.fullName || "Admin"}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">User Verification</h1>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList>
            <TabsTrigger value="pending">Pending Verifications</TabsTrigger>
            <TabsTrigger value="verified">Verified Users</TabsTrigger>
            <TabsTrigger value="rejected">Rejected Verifications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <p>Loading verification requests...</p>
              ) : pendingUsers.length === 0 ? (
                <p>No pending verification requests</p>
              ) : (
                pendingUsers.map(user => (
                  <Card key={user.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle>{user.name || "Unnamed User"}</CardTitle>
                        <Badge>{user.role}</Badge>
                      </div>
                      <CardDescription>{user.email}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      {renderUserPhotos(user)}
                      <p className="text-sm text-muted-foreground">
                        Submitted: {formatDate(user.createdAt)}
                      </p>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenRejectionDialog(user.id)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleVerification(user.id, "verified")}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Verify
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="verified" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <p>Loading verified users...</p>
              ) : verifiedUsers.length === 0 ? (
                <p>No verified users found</p>
              ) : (
                verifiedUsers.map(user => (
                  <Card key={user.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>{user.name || "Unnamed User"}</CardTitle>
                        <Badge>{user.role}</Badge>
                      </div>
                      <CardDescription>{user.email}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {renderUserPhotos(user)}
                      <p className="text-sm text-muted-foreground">
                        Verified: {formatDate(user.createdAt)}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="rejected" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <p>Loading rejected verifications...</p>
              ) : rejectedUsers.length === 0 ? (
                <p>No rejected verifications found</p>
              ) : (
                rejectedUsers.map(user => (
                  <Card key={user.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>{user.name || "Unnamed User"}</CardTitle>
                        <Badge>{user.role}</Badge>
                      </div>
                      <CardDescription>{user.email}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {renderUserPhotos(user)}
                      <p className="text-sm text-muted-foreground">
                        Rejected: {formatDate(user.createdAt)}
                      </p>
                      {user.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded">
                          <p className="text-sm font-medium">Rejection reason:</p>
                          <p className="text-sm">{user.rejectionReason}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be visible to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea 
                id="rejection-reason" 
                placeholder="Please provide a clear reason for rejection"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRejectionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRejectWithReason}
              variant="destructive"
            >
              Reject Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
} 