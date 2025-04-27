"use client"

import { getUserBids, updateBid, withdrawBid } from "@/actions/utility/task-utility"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@clerk/nextjs"
import { Clock, DollarSign, Loader2, Search } from "lucide-react"
import Link from "next/link"
import React, { useEffect, useState } from "react"
import { toast } from "sonner"
import { doerNavItems } from "../../navigation-config"



interface Bid {
  id: string;
  status: string;
  bidAmount: number;
  bidDescription: string;
  createdAt: Date;
  task: {
    id: string;
    title: string;
    description: string;
    category: string;
    budget: number;
    deadline: Date;
    status: string;
    poster: {
      id: string;
      name: string | null;
      image: string | null;
    }
  }
}

export default function MyBids() {
  const { user, isLoaded } = useUser();
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBids() {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const result = await getUserBids(user.id);
        
        if (result.success) {
          setBids(result.data || []);
        } else {
          toast.error(result.error || "Failed to load your bids");
        }
      } catch (error) {
        console.error("Error fetching bids:", error);
        toast.error("Failed to load your bids");
      } finally {
        setLoading(false);
      }
    }
    
    if (isLoaded) {
      fetchBids();
    }
  }, [user?.id, isLoaded]);

  // Filter bids based on search and status
  const filterBids = (bids: Bid[]) => {
    return bids.filter((bid) => {
      const matchesSearch =
        bid.task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.task.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || bid.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }

  // Sort bids based on selected sort option
  const sortBids = (bids: Bid[]) => {
    switch (sortBy) {
      case "newest":
        return [...bids].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      case "oldest":
        return [...bids].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      case "budget-high":
        return [...bids].sort((a, b) => b.task.budget - a.task.budget)
      case "budget-low":
        return [...bids].sort((a, b) => a.task.budget - b.task.budget)
      case "deadline":
        return [...bids].sort((a, b) => new Date(a.task.deadline).getTime() - new Date(b.task.deadline).getTime())
      default:
        return bids
    }
  }

  const pendingBids = bids.filter((bid) => bid.status === "pending")
  const acceptedBids = bids.filter((bid) => bid.status === "accepted")
  const rejectedBids = bids.filter((bid) => bid.status === "rejected")

  const filteredAllBids = sortBids(filterBids(bids))
  const filteredPendingBids = sortBids(filterBids(pendingBids))
  const filteredAcceptedBids = sortBids(filterBids(acceptedBids))
  const filteredRejectedBids = sortBids(filterBids(rejectedBids))

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
    return new Date(date).toLocaleDateString(undefined, options)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      case "accepted":
        return <Badge variant="default">Accepted</Badge>
      case "rejected":
        return <Badge variant="secondary">Rejected</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <DashboardLayout navItems={doerNavItems} userRole="doer" userName={user?.fullName || ""}>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading your bids...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={doerNavItems} userRole="doer" userName={user?.fullName || ""}>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">My Bids</h1>
          <Button asChild>
            <Link href="/doer/available-tasks">
              <Search className="mr-2 h-4 w-4" />
              Find More Tasks
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 w-full">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pending Bids</CardTitle>
              <CardDescription>Awaiting response from posters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingBids.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Accepted Bids</CardTitle>
              <CardDescription>Bids that have been accepted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{acceptedBids.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Rejected Bids</CardTitle>
              <CardDescription>Bids that were not accepted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{rejectedBids.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search bids..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bids</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="budget-high">Budget: High to Low</SelectItem>
                    <SelectItem value="budget-low">Budget: Low to High</SelectItem>
                    <SelectItem value="deadline">Deadline: Soonest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="all">All ({bids.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({pendingBids.length})</TabsTrigger>
                <TabsTrigger value="accepted">Accepted ({acceptedBids.length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({rejectedBids.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="space-y-4">
                {filteredAllBids.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No bids found</p>
                  </div>
                ) : (
                  filteredAllBids.map((bid) => (
                    <BidCard key={bid.id} bid={bid} formatDate={formatDate} getStatusBadge={getStatusBadge} />
                  ))
                )}
              </TabsContent>
              <TabsContent value="pending" className="space-y-4">
                {filteredPendingBids.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No pending bids found</p>
                  </div>
                ) : (
                  filteredPendingBids.map((bid) => (
                    <BidCard key={bid.id} bid={bid} formatDate={formatDate} getStatusBadge={getStatusBadge} />
                  ))
                )}
              </TabsContent>
              <TabsContent value="accepted" className="space-y-4">
                {filteredAcceptedBids.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No accepted bids found</p>
                  </div>
                ) : (
                  filteredAcceptedBids.map((bid) => (
                    <BidCard key={bid.id} bid={bid} formatDate={formatDate} getStatusBadge={getStatusBadge} />
                  ))
                )}
              </TabsContent>
              <TabsContent value="rejected" className="space-y-4">
                {filteredRejectedBids.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No rejected bids found</p>
                  </div>
                ) : (
                  filteredRejectedBids.map((bid) => (
                    <BidCard key={bid.id} bid={bid} formatDate={formatDate} getStatusBadge={getStatusBadge} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

// Create a separate component for bid cards for cleaner code
interface BidCardProps {
  bid: Bid;
  formatDate: (date: Date) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}

function BidCard({ bid, formatDate, getStatusBadge }: BidCardProps) {
  const { user } = useUser();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedContent, setEditedContent] = useState(bid.bidDescription);
  const [editedAmount, setEditedAmount] = useState(bid.bidAmount);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleWithdraw = async () => {
    if (!confirm("Are you sure you want to withdraw this bid? This action cannot be undone.")) {
      return;
    }
    
    if (!user?.id) {
      toast.error("You must be logged in to withdraw a bid");
      return;
    }
    
    setIsWithdrawing(true);
    try {
      const result = await withdrawBid(bid.id, user.id);
      
      if (result.success) {
        toast.success(result.message || "Bid withdrawn successfully");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error(result.error || "Failed to withdraw bid");
      }
    } catch (error) {
      console.error("Error withdrawing bid:", error);
      toast.error("Failed to withdraw bid");
    } finally {
      setIsWithdrawing(false);
    }
  };
  
  const handleSaveEdit = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to update a bid");
      return;
    }
    
    if (!editedContent.trim()) {
      toast.error("Bid description is required");
      return;
    }
    
    if (!editedAmount || editedAmount <= 0) {
      toast.error("Please enter a valid bid amount");
      return;
    }
    
    setIsUpdating(true);
    try {
      const result = await updateBid(bid.id, user.id, editedContent, editedAmount);
      
      if (result.success) {
        toast.success(result.message || "Bid updated successfully");
        setShowEditModal(false);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error(result.error || "Failed to update bid");
      }
    } catch (error) {
      console.error("Error updating bid:", error);
      toast.error("Failed to update bid");
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">
                <Link href={`/doer/tasks/${bid.task.id}`} className="hover:underline">
                  {bid.task.title}
                </Link>
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {bid.task.description}
              </p>
            </div>
            <div>{getStatusBadge(bid.status)}</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Category</p>
              <p>{bid.task.category}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Task Budget</p>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <p>${bid.task.budget.toFixed(2)}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Your Bid</p>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <p>${bid.bidAmount.toFixed(2)}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Deadline</p>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <p>{formatDate(bid.task.deadline)}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-sm">Poster</p>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="h-6 w-6">
                <AvatarImage src={bid.task.poster.image || undefined} />
                <AvatarFallback>{bid.task.poster.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <p className="text-sm">{bid.task.poster.name || "Unknown User"}</p>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-sm">Your Proposal</p>
            <p className="text-sm mt-1 line-clamp-2">{bid.bidDescription}</p>
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <p>Submitted on {formatDate(bid.createdAt)}</p>
            <div className="flex gap-2">
              {bid.status === "pending" && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowEditModal(true)}
                  >
                    Edit Bid
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleWithdraw}
                    disabled={isWithdrawing}
                  >
                    {isWithdrawing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Withdrawing...
                      </>
                    ) : (
                      "Withdraw Bid"
                    )}
                  </Button>
                </>
              )}
              <Button variant="default" size="sm" asChild>
                <Link href={`/doer/tasks/${bid.task.id}`}>View Details</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Edit Your Bid</CardTitle>
              <CardDescription>Make changes to your bid for {bid.task.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bid Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    className="pl-8"
                    value={editedAmount || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditedAmount(value === '' ? 0 : parseFloat(value));
                    }}
                    min={0}
                    step={0.01}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Original task budget: ${bid.task.budget.toFixed(2)}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Proposal Description</label>
                <Textarea 
                  value={editedContent} 
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={5}
                  placeholder="Describe why you're a good fit for this task"
                />
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button 
                onClick={handleSaveEdit} 
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Updating...
                  </>
                ) : "Save Changes"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}

