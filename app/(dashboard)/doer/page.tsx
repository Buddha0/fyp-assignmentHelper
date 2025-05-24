"use client"

import {
  getActiveTasks,
  getAvailableTasks,
  getRecentBids,
  getUserActivitySummary,
} from "@/actions/doer-dashboard"
import { getDoerEarningsSummary } from "@/actions/doer-earnings"
import { getUserStats } from "@/actions/doer-stats"
import { getCurrentUser } from "@/actions/get-current-user"
import { doerNavItems } from "@/app/(dashboard)/navigation-config"
import { DashboardLayout } from "@/components/dashboard-layout"
import { RoleSwitcher } from "@/components/dashboard/role-switcher"
import { StatsCard } from "@/components/stats-card"
import { TaskCard } from "@/components/task-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { mapAssignmentStatusToTaskStatus } from "@/types/doer-dashboard"
import { useUser } from "@clerk/nextjs"
import { AssignmentStatus, Role } from "@prisma/client"
import {
  Briefcase,
  CheckCircle,
  Clock,
  DollarSign,
  MessageSquare,
  Search
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

// Define types that match the actual data structure returned by API
interface Task {
  id: string
  title: string
  description?: string
  budget: number
  deadline: Date
  status: string
  category: string
  progress?: number
  posterName?: string
  messagesCount?: number
  bidsCount?: number
  poster?: {
    name: string
    image: string
  }
}

interface Bid {
  id: string
  bidAmount: number
  content: string
  status: string
  createdAt: Date
  userId?: string
  assignmentId?: string
  assignment: {
    title: string
  }
  taskId?: string
  taskTitle?: string
  taskBudget?: number
  taskStatus?: string
}

interface Message {
  id: string
  content: string
  createdAt: Date
  isRead?: boolean
  senderId?: string
  receiverId?: string
  assignment?: any
  sender?: {
    name: string
    image: string
  }
  taskTitle?: string
}

interface ActivitySummary {
  recentMessages: Message[]
  recentTaskUpdates: {
    id: string
    title: string
    status: string
    updatedAt: Date
  }[]
  recentBid: Bid | null
}

interface UserStats {
  activeTasks: number
  completedTasks: number
  totalEarnings: number
  unreadMessages: number
}

// Helper function to format timestamps
function formatTimestamp(date: Date | string) {
  const now = new Date();
  const timestamp = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return timestamp.toLocaleDateString();
  }
}

function LoadingCard() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-2">
        <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </CardHeader>
      <CardContent>
        <div className="h-20 bg-gray-200 rounded"></div>
      </CardContent>
    </Card>
  )
}

export default function DoerDashboard() {
  const { user } = useUser()
  const [currentRole, setCurrentRole] = useState<Role>("DOER")
  const router = useRouter()
  
  // State for DB data
  const [activeTasks, setActiveTasks] = useState<Task[]>([])
  const [availableTasks, setAvailableTasks] = useState<Task[]>([])
  const [recentBids, setRecentBids] = useState<Bid[]>([])
  const [activitySummary, setActivitySummary] = useState<ActivitySummary>({
    recentMessages: [],
    recentTaskUpdates: [],
    recentBid: null
  })
  const [userStats, setUserStats] = useState<UserStats>({
    activeTasks: 0,
    completedTasks: 0,
    totalEarnings: 0,
    unreadMessages: 0
  })
  const [loading, setLoading] = useState(true)
  
  // Get user data
  useEffect(() => {
    async function fetchUserData() {
      if (user?.id) {
        try {
          setLoading(true)
          // Removed unused userData variable
          await getCurrentUser()
          
          // Fetch all data in parallel
          const [
            activeTasksData,
            availableTasksData,
            recentBidsData,
            activitySummaryData,
            userStatsData,
            earningsSummary
          ] = await Promise.all([
            getActiveTasks(user.id),
            getAvailableTasks(),
            getRecentBids(user.id),
            getUserActivitySummary(user.id),
            getUserStats(user.id),
            getDoerEarningsSummary(user.id)
          ])
          
          // Transform active tasks data
          const mappedActiveTasks = activeTasksData?.map((task: any) => ({
            id: task.id,
            title: task.title || "Untitled Task",
            description: task.description || "",
            budget: task.budget,
            deadline: task.deadline,
            status: task.status || "PENDING",
            category: task.category,
            progress: task.progress || 0,
            posterName: task.poster?.name,
            messagesCount: task.messagesCount || 0
          })) || []
          
          // Transform available tasks data
          const mappedAvailableTasks = availableTasksData?.map((task: any) => ({
            id: task.id,
            title: task.title || "Untitled Task",
            description: task.description || "",
            budget: task.budget,
            deadline: task.deadline,
            status: "OPEN",
            category: task.category,
            bidsCount: task.bidCount || 0
          })) || []
          
          // Transform bids data
          const mappedBids = recentBidsData?.map((bid: any) => ({
            id: bid.id,
            bidAmount: bid.bidAmount,
            content: bid.content || "",
            status: bid.status,
            createdAt: bid.createdAt,
            assignment: {
              title: bid.taskTitle || "Untitled Task"
            }
          })) || []
          
          // Map activity summary
          const mappedActivitySummary = {
            recentMessages: activitySummaryData?.recentMessages?.map((msg: any) => ({
              id: msg.id,
              content: msg.content,
              createdAt: msg.createdAt,
              sender: msg.sender
            })) || [],
            recentTaskUpdates: activitySummaryData?.recentTaskUpdates || [],
            recentBid: null
          }
          
          // Debug and set recentBid if it exists
          if (activitySummaryData?.recentBid) {
                        
            // Create bid with required fields and fallbacks for any missing properties
            mappedActivitySummary.recentBid = {
              id: activitySummaryData.recentBid.id,
              bidAmount: 0, // Default value since actual property is missing
              content: "",  // Default empty content
              status: activitySummaryData.recentBid.status || "pending",
              createdAt: activitySummaryData.recentBid.createdAt,
              assignment: {
                title: activitySummaryData.recentBid.taskTitle || "Untitled Task"
              }
            };
          }
          
          setActiveTasks(mappedActiveTasks)
          setAvailableTasks(mappedAvailableTasks)
          setRecentBids(mappedBids)
          setActivitySummary(mappedActivitySummary)
          setUserStats({
            ...(userStatsData || {
              activeTasks: 0,
              completedTasks: 0,
              unreadMessages: 0
            }),
            totalEarnings: earningsSummary?.totalEarnings || 0
          })
        } catch (error) {
          console.error("Error fetching user data:", error)
          toast.error("Failed to load your data")
        } finally {
          setLoading(false)
        }
      }
    }
    
    fetchUserData()
  }, [user?.id])

  // Update this useEffect to properly track currentRole from user metadata
  useEffect(() => {
    if (user?.publicMetadata?.role) {
      setCurrentRole(user.publicMetadata.role as Role)
    }
  }, [user?.publicMetadata?.role])

  // Show welcome toast when component mounts
  const welcomeToastShown = useRef(false);
  useEffect(() => {
    if (user && !welcomeToastShown.current) {
      toast.success(`Welcome back, ${user.fullName || 'Doer'}!`, {
        description: "You're in the doer dashboard",
      });
      welcomeToastShown.current = true;
    }
  }, [user]);

  const handleFindTasks = () => {
    router.push("/doer/available-tasks")
    toast.info("Browsing available tasks")
  }

  return (
    <DashboardLayout navItems={doerNavItems} userRole="doer" userName={user?.fullName || ""}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 text-sm font-medium">You are a Doer</Badge>
          </div>
          <Button onClick={handleFindTasks}>
            <Search className="mr-2 h-4 w-4" />
            Find Tasks
          </Button>
        </div>

        {/* Role Switcher */}
        <RoleSwitcher currentRole={currentRole} />

        {loading ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array(4).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-10 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="active" className="w-full">
              <TabsList>
                <TabsTrigger value="active">Active Tasks</TabsTrigger>
                <TabsTrigger value="available">Available Tasks</TabsTrigger>
                <TabsTrigger value="recent-bids">Recent Bids</TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array(3).fill(0).map((_, i) => <LoadingCard key={i} />)}
                </div>
              </TabsContent>
              <TabsContent value="available" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array(3).fill(0).map((_, i) => <LoadingCard key={i} />)}
                </div>
              </TabsContent>
              <TabsContent value="recent-bids" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array(3).fill(0).map((_, i) => <LoadingCard key={i} />)}
                </div>
              </TabsContent>
            </Tabs>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest updates and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex items-start gap-4 rounded-lg border p-4 animate-pulse">
                      <div className="h-5 w-5 rounded-full bg-gray-200"></div>
                      <div className="w-full">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Active Tasks"
                value={userStats.activeTasks}
                description="Tasks currently in progress"
                icon={Clock}
              />
              <StatsCard
                title="Completed Tasks"
                value={userStats.completedTasks}
                description="Successfully completed tasks"
                icon={CheckCircle}
              />
              <StatsCard
                title="Total Earnings"
                value={`Rs ${userStats.totalEarnings.toFixed(2)}`}
                description="Money earned from completed tasks"
                icon={DollarSign}
              />
              <StatsCard 
                title="Messages" 
                value={userStats.unreadMessages} 
                description="Unread messages from posters" 
                icon={MessageSquare} 
              />
            </div>

            <Tabs defaultValue="active" className="w-full">
              <TabsList>
                <TabsTrigger value="active">Active Tasks</TabsTrigger>
                <TabsTrigger value="available">Available Tasks</TabsTrigger>
                <TabsTrigger value="recent-bids">Recent Bids</TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeTasks.length > 0 ? (
                    activeTasks.map((task) => (
                      <TaskCard 
                        key={task.id} 
                        id={task.id}
                        title={task.title || "Untitled Task"}
                        description={task.description || ""}
                        category={task.category || ""}
                        budget={task.budget || 0}
                        deadline={task.deadline}
                        status={mapAssignmentStatusToTaskStatus(task.status || AssignmentStatus.OPEN)}
                        progress={task.progress || 0}
                        posterName={task.posterName || "Poster"}
                        messagesCount={task.messagesCount || 0}
                        viewType="doer" 
                      />
                    ))
                  ) : (
                    <div className="col-span-3 flex justify-center py-8">
                      <p className="text-muted-foreground">No active tasks found</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="available" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {availableTasks.length > 0 ? (
                    availableTasks.slice(0, 3).map((task) => (
                      <TaskCard 
                        key={task.id} 
                        id={task.id}
                        title={task.title || "Untitled Task"}
                        description={task.description || ""}
                        category={task.category || ""}
                        budget={task.budget || 0}
                        deadline={task.deadline}
                        status={mapAssignmentStatusToTaskStatus(task.status || AssignmentStatus.OPEN)}
                        bidsCount={task.bidsCount || 0}
                        viewType="doer" 
                      />
                    ))
                  ) : (
                    <div className="col-span-3 flex justify-center py-8">
                      <p className="text-muted-foreground">No available tasks found</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="recent-bids" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recentBids.length > 0 ? (
                    recentBids.map((bid) => (
                      <Card key={bid.id}>
                        <CardHeader>
                          <CardTitle>{bid.assignment.title}</CardTitle>
                          <CardDescription>Bid submitted {formatTimestamp(bid.createdAt)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium">Your Bid:</span>
                            <span className="font-bold">Rs {bid.bidAmount.toFixed(2)}</span>
                          </div>
                          <p className="line-clamp-2 text-sm text-muted-foreground">{bid.content}</p>
                          <div className="mt-4">
                            <Badge className={
                              bid.status === "accepted" ? "bg-green-500 text-white" : 
                              bid.status === "rejected" ? "bg-red-500 text-white" : 
                              "bg-yellow-500 text-white"
                            }>
                              {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-3 flex justify-center py-8">
                      <p className="text-muted-foreground">No recent bids found</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Activity Feed */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest updates and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                {activitySummary.recentMessages.length > 0 || 
                 activitySummary.recentTaskUpdates.length > 0 ||
                 activitySummary.recentBid ? (
                  <div className="space-y-4">
                    {activitySummary.recentMessages.map((message) => (
                      <div key={message.id} className="flex items-start gap-4 rounded-lg border p-4">
                        <MessageSquare className="mt-1 h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">New message from {message.sender?.name || 'Poster'}</p>
                          <p className="line-clamp-1 text-sm text-muted-foreground">{message.content}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(message.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                    
                    {activitySummary.recentTaskUpdates.map((task) => (
                      <div key={task.id} className="flex items-start gap-4 rounded-lg border p-4">
                        <Clock className="mt-1 h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="font-medium">Task update</p>
                          <p className="line-clamp-1 text-sm text-muted-foreground">
                            {task.title} status updated to {task.status.toLowerCase().replace('_', ' ')}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(task.updatedAt)}</p>
                        </div>
                      </div>
                    ))}
                    
                    {activitySummary.recentBid && (
                      <div className="flex items-start gap-4 rounded-lg border p-4">
                        <Briefcase className="mt-1 h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">Bid placed</p>
                          <p className="line-clamp-1 text-sm text-muted-foreground">
                            You bid Rs {activitySummary.recentBid.bidAmount.toFixed(2)} on {activitySummary.recentBid.assignment.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(activitySummary.recentBid.createdAt)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-center py-8">
                    <p className="text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

