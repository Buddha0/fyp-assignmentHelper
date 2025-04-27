"use client"

import { getActiveTasks } from "@/actions/doer-dashboard"
import { getUserId } from "@/actions/utility/user-utility"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  Search,
  User
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { doerNavItems } from "../../navigation-config"

// Define interfaces for task data
interface TaskData {
  id: string;
  title: string;
  description?: string;
  category: string;
  budget: number;
  deadline: Date;
  status: string;
  progress?: number;
  doerId?: string | null;
  posterId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  posterName?: string;
  posterImage?: string | null;
  poster?: {
    name: string | null;
    image: string | null;
  };
  dateAccepted?: Date;
  dateCompleted?: Date;
  messagesCount?: number;
  submissionsCount?: number;
  bidsCount?: number;
  hasSubmissions?: boolean;
  attachments?: any;
}



export default function ActiveTasks() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("deadline")
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch tasks from the database
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Get the current user's ID
        const userId = await getUserId();
        
        if (!userId) {
          throw new Error("Not authenticated");
        }
        
        // Use the server action to fetch tasks for this user
        const result = await getActiveTasks(userId);
        
        if (result) {
          setTasks(result);
        } else {
          setError("Failed to load tasks");
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError("Failed to load your tasks. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // Filter tasks based on search and status
  const filterTasks = (taskList: TaskData[]) => {
    return taskList.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description ? task.description.toLowerCase().includes(searchQuery.toLowerCase()) : false)
      const matchesStatus = statusFilter === "all" || task.status.toLowerCase() === statusFilter

      return matchesSearch && matchesStatus
    })
  }

  // Sort tasks based on selected sort option
  const sortTasks = (taskList: TaskData[]) => {
    switch (sortBy) {
      case "newest":
        return [...taskList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      case "oldest":
        return [...taskList].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      case "budget-high":
        return [...taskList].sort((a, b) => b.budget - a.budget)
      case "budget-low":
        return [...taskList].sort((a, b) => a.budget - b.budget)
      case "deadline":
        return [...taskList].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      default:
        return taskList
    }
  }

  const inProgressTasks = tasks.filter((task: TaskData) => task.status.toLowerCase() === "in_progress" || task.status.toLowerCase() === "in-progress")
  const pendingReviewTasks = tasks.filter((task: TaskData) => task.status.toLowerCase() === "under_review" || task.status.toLowerCase() === "pending-review")
  const completedTasks = tasks.filter((task: TaskData) => task.status.toLowerCase() === "completed")
  const assignedTasks = tasks.filter((task: TaskData) => task.status.toLowerCase() === "assigned")

  const filteredAllTasks = sortTasks(filterTasks(tasks))
  const filteredInProgressTasks = sortTasks(filterTasks(inProgressTasks))
  const filteredPendingReviewTasks = sortTasks(filterTasks(pendingReviewTasks))
  const filteredCompletedTasks = sortTasks(filterTasks(completedTasks))
  const filteredAssignedTasks = sortTasks(filterTasks(assignedTasks))

  const formatDate = (dateString: string | Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "in_progress":
      case "in-progress":
        return <Badge className="bg-yellow-500 text-white">In Progress</Badge>
      case "under_review":
      case "pending-review":
        return <Badge className="bg-purple-500 text-white">Pending Review</Badge>
      case "completed":
        return <Badge className="bg-green-500 text-white">Completed</Badge>
      case "assigned":
        return <Badge className="bg-blue-500 text-white">Assigned</Badge>
      case "in_dispute":
      case "in-dispute":
        return <Badge className="bg-red-500 text-white">In Dispute</Badge>
      default:
        return null
    }
  }

  const getDaysLeft = (deadline: string | Date) => {
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (isLoading) {
    return (
      <DashboardLayout navItems={doerNavItems} userRole="doer" userName="User">
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-xl">Loading your tasks...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout navItems={doerNavItems} userRole="doer" userName="User">
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout navItems={doerNavItems} userRole="doer" userName="User">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Active Tasks</h1>
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
              <CardTitle className="text-lg">In Progress</CardTitle>
              <CardDescription>Tasks you are currently working on</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{inProgressTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pending Review</CardTitle>
              <CardDescription>Tasks awaiting client review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingReviewTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Completed</CardTitle>
              <CardDescription>Successfully completed tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedTasks.length}</div>
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
                    placeholder="Search tasks..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="under_review">Pending Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deadline">Deadline: Soonest First</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="budget-high">Budget: High to Low</SelectItem>
                    <SelectItem value="budget-low">Budget: Low to High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Tasks ({filteredAllTasks.length})</TabsTrigger>
            <TabsTrigger value="assigned">Assigned ({filteredAssignedTasks.length})</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress ({filteredInProgressTasks.length})</TabsTrigger>
            <TabsTrigger value="pending-review">Pending Review ({filteredPendingReviewTasks.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({filteredCompletedTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {filteredAllTasks.length > 0 ? (
              <div className="space-y-4">
                {filteredAllTasks.map((task) => (
                  <Card key={task.id} className={task.category === "urgent" ? "border-red-500" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                          {task.category === "urgent" && <Badge variant="destructive">Urgent</Badge>}
                        </div>
                        {getStatusBadge(task.status)}
                      </div>
                      <CardDescription className="line-clamp-1">{task.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Budget:</span>
                            <span className="text-sm">${task.budget}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Deadline:</span>
                            <span className="text-sm">{formatDate(task.deadline)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Category:</span>
                            <span className="text-sm">{task.category}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Posted by:</span>
                            <div className="flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={task.poster?.image ?? undefined} />
                                <AvatarFallback>{task.poster?.name?.charAt(0) || 'P'}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{task.poster?.name || 'Client'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Accepted on:</span>
                            <span className="text-sm">
                              {task.dateAccepted 
                                ? formatDate(task.dateAccepted) 
                                : (task.createdAt 
                                  ? formatDate(task.createdAt) 
                                  : "Not available")
                              }
                            </span>
                          </div>

                        </div>
                      </div>
                    </CardContent>
                    <CardContent className="flex justify-between items-center pt-0">
                      <div>
                        {(task.status.toLowerCase() === "in_progress" || task.status.toLowerCase() === "in-progress") && (
                          <div
                            className={`text-sm ${getDaysLeft(task.deadline) <= 3 ? "text-red-500 font-medium" : "text-muted-foreground"}`}
                          >
                            {getDaysLeft(task.deadline)} days left
                          </div>
                        )}
                      </div>
                      <Button asChild size="sm">
                        <Link href={`/doer/tasks/${task.id}`}>View Task</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No tasks found</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("all")
                    setSortBy("deadline")
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="assigned" className="mt-4">
            {filteredAssignedTasks.length > 0 ? (
              <div className="space-y-4">
                {filteredAssignedTasks.map((task) => (
                  <Card key={task.id} className={task.category === "urgent" ? "border-red-500" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                          {task.category === "urgent" && <Badge variant="destructive">Urgent</Badge>}
                        </div>
                        {getStatusBadge(task.status)}
                      </div>
                      <CardDescription className="line-clamp-1">{task.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Budget:</span>
                            <span className="text-sm">${task.budget}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Deadline:</span>
                            <span className="text-sm">{formatDate(task.deadline)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Category:</span>
                            <span className="text-sm">{task.category}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Posted by:</span>
                            <div className="flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={task.poster?.image ?? undefined} />
                                <AvatarFallback>{task.poster?.name?.charAt(0) || 'P'}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{task.poster?.name || 'Client'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Accepted on:</span>
                            <span className="text-sm">
                              {task.dateAccepted 
                                ? formatDate(task.dateAccepted) 
                                : (task.createdAt 
                                  ? formatDate(task.createdAt) 
                                  : "Not available")
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardContent className="flex justify-between items-center pt-0">
                      <div
                        className={`text-sm ${getDaysLeft(task.deadline) <= 3 ? "text-red-500 font-medium" : "text-muted-foreground"}`}
                      >
                        {getDaysLeft(task.deadline)} days left
                      </div>
                      <Button asChild size="sm">
                        <Link href={`/doer/tasks/${task.id}`}>View Task</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No assigned tasks found</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("assigned")
                    setSortBy("deadline")
                  }}
                >
                  Clear Search
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="in-progress" className="mt-4">
            {filteredInProgressTasks.length > 0 ? (
              <div className="space-y-4">
                {filteredInProgressTasks.map((task) => (
                  <Card key={task.id} className={task.category === "urgent" ? "border-red-500" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                          {task.category === "urgent" && <Badge variant="destructive">Urgent</Badge>}
                        </div>
                        {getStatusBadge(task.status)}
                      </div>
                      <CardDescription className="line-clamp-1">{task.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-me dium">Budget:</span>
                            <span className="text-sm">${task.budget}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Deadline:</span>
                            <span className="text-sm">{formatDate(task.deadline)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Category:</span>
                            <span className="text-sm">{task.category}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Posted by:</span>
                            <div className="flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={task.poster?.image ?? undefined} />
                                <AvatarFallback>{task.poster?.name?.charAt(0) || 'P'}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{task.poster?.name || 'Client'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Accepted on:</span>
                            <span className="text-sm">
                              {task.dateAccepted 
                                ? formatDate(task.dateAccepted) 
                                : (task.createdAt 
                                  ? formatDate(task.createdAt) 
                                  : "Not available")
                              }
                            </span>
                          </div>

                        </div>
                      </div>
                    </CardContent>
                    <CardContent className="flex justify-between items-center pt-0">
                      <div
                        className={`text-sm ${getDaysLeft(task.deadline) <= 3 ? "text-red-500 font-medium" : "text-muted-foreground"}`}
                      >
                        {getDaysLeft(task.deadline)} days left
                      </div>
                      <Button asChild size="sm">
                        <Link href={`/doer/tasks/${task.id}`}>View Task</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No in-progress tasks found</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("in_progress")
                    setSortBy("deadline")
                  }}
                >
                  Clear Search
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending-review" className="mt-4">
            {filteredPendingReviewTasks.length > 0 ? (
              <div className="space-y-4">
                {filteredPendingReviewTasks.map((task) => (
                  <Card key={task.id} className={task.category === "urgent" ? "border-red-500" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                          {task.category === "urgent" && <Badge variant="destructive">Urgent</Badge>}
                        </div>
                        {getStatusBadge(task.status)}
                      </div>
                      <CardDescription className="line-clamp-1">{task.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Budget:</span>
                            <span className="text-sm">${task.budget}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Deadline:</span>
                            <span className="text-sm">{formatDate(task.deadline)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Category:</span>
                            <span className="text-sm">{task.category}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Posted by:</span>
                            <div className="flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={task.poster?.image ?? undefined} />
                                <AvatarFallback>{task.poster?.name?.charAt(0) || 'P'}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{task.poster?.name || 'Client'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Accepted on:</span>
                            <span className="text-sm">
                              {task.dateAccepted 
                                ? formatDate(task.dateAccepted) 
                                : (task.createdAt 
                                  ? formatDate(task.createdAt) 
                                  : "Not available")
                              }
                            </span>
                          </div>

                        </div>
                      </div>
                    </CardContent>
                    <CardContent className="flex justify-end pt-0">
                      <Button asChild size="sm">
                        <Link href={`/doer/tasks/${task.id}`}>View Task</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No pending review tasks found</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("under_review")
                    setSortBy("deadline")
                  }}
                >
                  Clear Search
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {filteredCompletedTasks.length > 0 ? (
              <div className="space-y-4">
                {filteredCompletedTasks.map((task) => (
                  <Card key={task.id}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                        {getStatusBadge(task.status)}
                      </div>
                      <CardDescription className="line-clamp-1">{task.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Budget:</span>
                            <span className="text-sm">${task.budget}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Deadline:</span>
                            <span className="text-sm">{formatDate(task.deadline)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Category:</span>
                            <span className="text-sm">{task.category}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Posted by:</span>
                            <div className="flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={task.poster?.image ?? undefined} />
                                <AvatarFallback>{task.poster?.name?.charAt(0) || 'P'}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{task.poster?.name || 'Client'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Completed on:</span>
                            <span className="text-sm">{task.dateCompleted ? formatDate(task.dateCompleted) : formatDate(task.updatedAt)}</span>
                          </div>

                        </div>
                      </div>
                    </CardContent>
                    <CardContent className="flex justify-end pt-0">
                      <Button asChild size="sm">
                        <Link href={`/doer/tasks/${task.id}`}>View Task</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No completed tasks found</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("completed")
                    setSortBy("deadline")
                  }}
                >
                  Clear Search
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

