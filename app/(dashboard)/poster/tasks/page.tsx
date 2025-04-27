"use client"

import { getUserTasks } from "@/actions/utility/task-utility"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TaskCard } from "@/components/task-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EVENT_TYPES, getTaskChannel } from "@/lib/pusher"
import { pusherClient } from "@/lib/pusher-client"
import { useUser } from "@clerk/nextjs"
import { AssignmentStatus } from "@prisma/client"
import { FilePlus, Loader2, Search, X } from "lucide-react"
import Link from "next/link"
import type { Channel } from "pusher-js"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { posterNavItems } from "../../navigation-config"

// Define types
type UITaskStatus = "open" | "in-progress" | "pending-review" | "completed" | "assigned" | "in-dispute";

function mapAssignmentStatusToUIStatus(status: AssignmentStatus): UITaskStatus {
  switch (status) {
    case "OPEN":
      return "open"
    case "ASSIGNED":
      return "assigned" 
    case "IN_PROGRESS":
      return "in-progress"
    case "UNDER_REVIEW":
      return "pending-review"
    case "COMPLETED":
      return "completed"
    case "IN_DISPUTE":
      return "in-dispute"
    default:
      return "open"
  }
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  deadline: string;
  status: UITaskStatus;
  doerName?: string;
  messagesCount?: number;
  bidsCount?: number;
  createdAt: string;
}

export default function PosterTasks() {
  const { user } = useUser()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [sortBy, setSortBy] = useState("newest")

  // Load tasks function, wrapped in useCallback to prevent dependency issues
  const loadTasks = useCallback(async () => {
    if (!user?.id) return

    try {
      const result = await getUserTasks(user.id)
      if (result.success && result.data) {
        // Transform the data to match our Task interface
        const transformedTasks = result.data.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          category: task.category,
          budget: task.budget,
          deadline: task.deadline.toISOString().split('T')[0],
          status: mapAssignmentStatusToUIStatus(task.status),
          doerName: task.doerName,
          messagesCount: task.messagesCount,
          bidsCount: task.bidsCount,
          createdAt: task.createdAt.toISOString()
        }))
        setTasks(transformedTasks)
      } else {
        toast.error(result.error || "Failed to load tasks")
      }
    } catch (error) {
      console.error("Error loading tasks:", error)
      toast.error("Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }, [user?.id]) // Include user?.id as a dependency

  // Initial loading of tasks
  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Setup Pusher subscriptions for real-time updates
  useEffect(() => {
    if (!user?.id) return;
    
    const userChannel = `user-${user.id}`;
    const userNotificationChannel = pusherClient.subscribe(userChannel);
    const taskChannels: { taskId: string, channel: Channel }[] = [];
    
    // Subscribe to channels for each task
    tasks.forEach(task => {
      const channel = pusherClient.subscribe(getTaskChannel(task.id));
      taskChannels.push({ taskId: task.id, channel });
      
      // Handle new bid events
      channel.bind(EVENT_TYPES.NEW_BID, (data: any) => {
        console.log(`New bid received for task ${task.id}:`, data);
        // Refresh task list when a new bid is received
        loadTasks();
      });
    });
    
    // Listen for general notifications
    userNotificationChannel.bind(EVENT_TYPES.NEW_NOTIFICATION, (data: any) => {
      console.log("New notification received:", data);
      if (data.type === 'new_bid') {
        console.log("Refreshing tasks due to new bid notification");
        loadTasks();
      }
    });
    
    // Cleanup function
    return () => {
      // Unsubscribe from all task channels
      taskChannels.forEach(({ taskId, channel }) => {
        channel.unbind(EVENT_TYPES.NEW_BID);
        pusherClient.unsubscribe(getTaskChannel(taskId));
      });
      
      // Unsubscribe from user channel
      userNotificationChannel.unbind(EVENT_TYPES.NEW_NOTIFICATION);
      pusherClient.unsubscribe(userChannel);
    };
  }, [user?.id, tasks, loadTasks]); // Add loadTasks as a dependency

  // Filter tasks based on search, category, and status
  const filterTasks = (tasks: Task[]): Task[] => {
    return tasks.filter((task: Task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || task.category === selectedCategory
      const matchesStatus = selectedStatus === "all" || task.status === selectedStatus

      return matchesSearch && matchesCategory && matchesStatus
    })
  }

  // Sort tasks based on selected sort option
  const sortTasks = (tasks: Task[]): Task[] => {
    switch (sortBy) {
      case "newest":
        return [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      case "oldest":
        return [...tasks].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      case "budget-high":
        return [...tasks].sort((a, b) => b.budget - a.budget)
      case "budget-low":
        return [...tasks].sort((a, b) => a.budget - b.budget)
      case "deadline":
        return [...tasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      default:
        return tasks
    }
  }

  const openTasks = tasks.filter((task: Task) => task.status === "open")
  const assignedTasks = tasks.filter((task: Task) => task.status === "assigned")
  const inProgressTasks = tasks.filter((task: Task) => task.status === "in-progress")
  const pendingReviewTasks = tasks.filter((task: Task) => task.status === "pending-review")
  const completedTasks = tasks.filter((task: Task) => task.status === "completed")

  const filteredAllTasks = sortTasks(filterTasks(tasks))
  const filteredOpenTasks = sortTasks(filterTasks(openTasks))
  const filteredAssignedTasks = sortTasks(filterTasks(assignedTasks))
  const filteredInProgressTasks = sortTasks(filterTasks(inProgressTasks))
  const filteredPendingReviewTasks = sortTasks(filterTasks(pendingReviewTasks))
  const filteredCompletedTasks = sortTasks(filterTasks(completedTasks))

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setSelectedStatus("all")
    setSortBy("newest")
  }

  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedStatus !== "all" || sortBy !== "newest"

  if (loading) {
    return (
      <DashboardLayout navItems={posterNavItems} userRole="poster" userName={user?.fullName || ""}>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout navItems={posterNavItems} userRole="poster" userName={user?.fullName || ""}>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
          <Button asChild>
            <Link href="/poster/create-task">
              <FilePlus className="mr-2 h-4 w-4" />
              Create New Task
            </Link>
          </Button>
        </div>

        <Card className="w-full">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search tasks..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Research">Research</SelectItem>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Programming">Programming</SelectItem>
                    <SelectItem value="Writing">Writing</SelectItem>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="pending-review">Pending Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="budget-high">Budget: High to Low</SelectItem>
                    <SelectItem value="budget-low">Budget: Low to High</SelectItem>
                    <SelectItem value="deadline">Deadline: Soonest First</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="outline" size="icon" onClick={clearFilters} title="Clear filters">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mt-2">
                {searchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: {searchQuery}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                  </Badge>
                )}
                {selectedCategory !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Category: {selectedCategory}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory("all")} />
                  </Badge>
                )}
                {selectedStatus !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Status: {selectedStatus}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedStatus("all")} />
                  </Badge>
                )}
                {sortBy !== "newest" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Sort: {sortBy.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSortBy("newest")} />
                  </Badge>
                )}
              </div>
            )}
          </CardHeader>
        </Card>

        <div className="task-stats grid gap-4 md:grid-cols-4 w-full">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Open Tasks</CardTitle>
              <CardDescription>Awaiting bids and assignment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{openTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Assigned Tasks</CardTitle>
              <CardDescription>Tasks assigned to others</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{assignedTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">In Progress</CardTitle>
              <CardDescription>Currently being worked on</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{inProgressTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pending Review</CardTitle>
              <CardDescription>Awaiting your review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingReviewTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Completed</CardTitle>
              <CardDescription>Successfully finished</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedTasks.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Tasks ({filteredAllTasks.length})</TabsTrigger>
            <TabsTrigger value="open">Open ({filteredOpenTasks.length})</TabsTrigger>
            <TabsTrigger value="assigned">Assigned ({filteredAssignedTasks.length})</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress ({filteredInProgressTasks.length})</TabsTrigger>
            <TabsTrigger value="pending-review">Pending Review ({filteredPendingReviewTasks.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({filteredCompletedTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {filteredAllTasks.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAllTasks.map((task: Task) => (
                  <TaskCard key={task.id} {...task} viewType="poster" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No tasks found</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="open" className="mt-4">
            {filteredOpenTasks.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOpenTasks.map((task: Task) => (
                  <TaskCard key={task.id} {...task} viewType="poster" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No open tasks found</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="assigned" className="mt-4">
            {filteredAssignedTasks.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAssignedTasks.map((task: Task) => (
                  <TaskCard key={task.id} {...task} viewType="poster" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No assigned tasks found</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="in-progress" className="mt-4">
            {filteredInProgressTasks.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredInProgressTasks.map((task: Task) => (
                  <TaskCard key={task.id} {...task} viewType="poster" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No in-progress tasks found</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending-review" className="mt-4">
            {filteredPendingReviewTasks.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPendingReviewTasks.map((task: Task) => (
                  <TaskCard key={task.id} {...task} viewType="poster" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No pending review tasks found</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {filteredCompletedTasks.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCompletedTasks.map((task: Task) => (
                  <TaskCard key={task.id} {...task} viewType="poster" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No completed tasks found</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

