"use client"

import { RoleSwitcher } from "@/components/dashboard/role-switcher"
import { posterNavItems } from "@/app/(dashboard)/navigation-config"
import { DashboardLayout } from "@/components/dashboard-layout"
import { StatsCard } from "@/components/stats-card"
import { TaskCard } from "@/components/task-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUser } from "@clerk/nextjs"
import { Role } from "@prisma/client"
import { formatDistanceToNow } from "date-fns"
import { CheckCircle, Clock, FilePlus, FileText, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { getPosterBids, getPosterStats, getPosterTasks, getTaskActivities } from "./actions"

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

export default function PosterDashboard() {
  const { user } = useUser()
  const [currentRole, setCurrentRole] = useState<Role>("POSTER")
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [bids, setBids] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Get user's role from metadata
  useEffect(() => {
    if (user?.publicMetadata?.role) {
      setCurrentRole(user.publicMetadata.role as Role)
    }
  }, [user?.publicMetadata?.role])

  // Fetch data from server actions
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        setError("")
        
        // Fetch all data in parallel
        const [statsData, tasksData, bidsData, activitiesData] = await Promise.all([
          getPosterStats(),
          getPosterTasks(),
          getPosterBids(),
          getTaskActivities()
        ])
        
        setStats(statsData)
        setTasks(tasksData)
        setBids(bidsData)
        setActivities(activitiesData)
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
        setError("Failed to load dashboard data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchDashboardData()
    }
  }, [user])

  // Show welcome toast when component mounts
  const welcomeToastShown = useRef(false);
  useEffect(() => {
    if (user && !welcomeToastShown.current) {
      toast.success(`Welcome back, ${user.fullName || 'Poster'}!`, {
        description: "You're in the poster dashboard",
      });
      welcomeToastShown.current = true;
    }
  }, [user]);

  const handleCreateTask = () => {
    router.push("/poster/create-task")
    toast.info("Starting a new task creation")
  }

  // Filter tasks by status for the tabs
  const pendingReviewTasks = tasks.filter(task => task.status === "pending-review") || []
  const activeTasks = tasks.filter(task => task.status === "in-progress") || []

  return (
    <DashboardLayout navItems={posterNavItems} userRole="poster" userName={user?.fullName || "Sarah Williams"}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <Badge variant="outline" className="bg-green-100 text-green-800 text-sm font-medium">You are a Poster</Badge>
          </div>
          <Button onClick={handleCreateTask}>
            <FilePlus className="mr-2 h-4 w-4" />
            Create New Task
          </Button>
        </div>

        {/* Role Switcher */}
        <RoleSwitcher currentRole={currentRole} />

        {error && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-md">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-10 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))
          ) : stats ? (
            <>
              <StatsCard
                title="Active Tasks"
                value={stats.activeTasks.toString()}
                description="Tasks currently in progress"
                icon={Clock}
                trend={{ value: 0, isPositive: true }}
              />
              <StatsCard
                title="Completed Tasks"
                value={stats.completedTasks.toString()}
                description="Successfully completed tasks"
                icon={CheckCircle}
                trend={{ value: 0, isPositive: true }}
              />
              <StatsCard
                title="Pending Reviews"
                value={stats.pendingReviews.toString()}
                description="Tasks awaiting your review"
                icon={FileText}
                trend={{ value: 0, isPositive: false }}
              />
              <StatsCard 
                title="Messages" 
                value={stats.unreadMessages.toString()} 
                description="Unread messages from doers" 
                icon={MessageSquare} 
              />
            </>
          ) : null}
        </div>

        <Tabs defaultValue="recent" className="w-full">
          <TabsList>
            <TabsTrigger value="recent">Recent Tasks</TabsTrigger>
            <TabsTrigger value="pending">Pending Review</TabsTrigger>
            <TabsTrigger value="active">Active Tasks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent" className="mt-4">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array(3).fill(0).map((_, i) => <LoadingCard key={i} />)}
              </div>
            ) : tasks.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tasks.map((task) => (
                  <TaskCard key={task.id} {...task} viewType="poster" />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No tasks found. Create your first task to get started.</p>
                <Button onClick={handleCreateTask} className="mt-4">
                  <FilePlus className="mr-2 h-4 w-4" />
                  Create Task
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array(3).fill(0).map((_, i) => <LoadingCard key={i} />)}
              </div>
            ) : pendingReviewTasks.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingReviewTasks.map((task) => (
                  <TaskCard key={task.id} {...task} viewType="poster" />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No tasks pending review at the moment.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array(3).fill(0).map((_, i) => <LoadingCard key={i} />)}
              </div>
            ) : activeTasks.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeTasks.map((task) => (
                  <TaskCard key={task.id} {...task} viewType="poster" />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No active tasks at the moment.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Bids</CardTitle>
              <CardDescription>Latest bids on your open tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3 animate-pulse">
                      <div className="w-1/2">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="w-1/4 text-right">
                        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4 ml-auto"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : bids.length > 0 ? (
                <div className="space-y-4">
                  {bids.map((bid) => (
                    <div key={bid.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{bid.doerName}</p>
                        <p className="text-sm text-muted-foreground">{bid.taskTitle}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${bid.amount}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-muted-foreground">No bids yet on your open tasks.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Task Activity</CardTitle>
              <CardDescription>Recent updates on your tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex gap-3 rounded-lg border p-3 animate-pulse">
                      <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                      <div className="w-full">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity, index) => (
                    <div key={index} className="flex gap-3 rounded-lg border p-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full 
                        ${activity.type === 'message' 
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200' 
                          : activity.title.includes('completed') 
                            ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}
                      >
                        {activity.type === 'message' ? (
                          <MessageSquare className="h-4 w-4" />
                        ) : activity.title.includes('completed') ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {activity.type === 'message' 
                            ? `New message from ${activity.actorName}` 
                            : activity.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          On &quot;{activity.description}&quot;
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-muted-foreground">No recent activity.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

