"use client"

import { getAvailableTasks, submitBid } from "@/actions/utility/task-utility"
import { doerNavItems } from "@/app/(dashboard)/navigation-config"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PlaceBidDialog } from "@/components/place-bid-dialog"
import { TaskCard } from "@/components/task-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUser } from "@clerk/nextjs"
import { Loader2, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

interface Task {
  id: string
  title: string
  description: string
  category: string
  budget: number
  deadline: Date
  status: string
  bidsCount: number
  createdAt: Date
  attachments?: any // This can be an array of URLs or attachment objects
  userHasBid: boolean
}

export default function AvailableTasks() {
  const { user } = useUser()
  const [isPending, startTransition] = useTransition()
  const [bidDialogOpen, setBidDialogOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter states
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [budgetRange, setBudgetRange] = useState("all")
  const [deadline, setDeadline] = useState("any")
  const [sortBy, setSortBy] = useState("newest")
  
  const router = useRouter()
  
  // Apply filters to tasks in memory
  const filteredTasks = useMemo(() => {
    let result = [...allTasks];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(task => 
        task.title.toLowerCase().includes(searchLower) || 
        task.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply category filter
    if (category !== "all") {
      result = result.filter(task => 
        task.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Apply budget filter
    if (budgetRange !== "all") {
      switch (budgetRange) {
        case "0-1000":
          result = result.filter(task => task.budget >= 0 && task.budget <= 1000);
          break;
        case "1000-5000":
          result = result.filter(task => task.budget > 1000 && task.budget <= 5000);
          break;
        case "5000+":
          result = result.filter(task => task.budget > 5000);
          break;
      }
    }
    
    // Apply deadline filter
    if (deadline !== "any") {
      const now = new Date();
      
      switch (deadline) {
        case "today":
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);
          result = result.filter(task => new Date(task.deadline) <= endOfDay);
          break;
        case "week":
          const oneWeekFromNow = new Date(now);
          oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
          result = result.filter(task => new Date(task.deadline) <= oneWeekFromNow);
          break;
        case "month":
          const oneMonthFromNow = new Date(now);
          oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
          result = result.filter(task => new Date(task.deadline) <= oneMonthFromNow);
          break;
      }
      
      // Filter out past deadlines
      result = result.filter(task => new Date(task.deadline) >= now);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "budget-high":
          return b.budget - a.budget;
        case "budget-low":
          return a.budget - b.budget;
        case "deadline":
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        default:
          return 0;
      }
    });
    
    return result;
  }, [allTasks, search, category, budgetRange, deadline, sortBy]);

  // Fetch all tasks only once on initial load
  useEffect(() => {
    async function fetchAllTasks() {
      try {
        setLoading(true);
        const result = await getAvailableTasks(user?.id);
        
        if (result.success && result.data) {
          setAllTasks(result.data);
        } else {
          toast.error(result.error || "Failed to load tasks");
        }
      } catch (error) {
        console.error("Error loading tasks:", error);
        toast.error("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }
    
    fetchAllTasks();
  }, [user?.id]);
  
  // Apply filters
  const handleApplyFilters = () => {
    // No need to fetch data again, just set isPending to trigger re-render
    startTransition(() => {
      // This is just to show loading state, filtering is handled by the useMemo
    });
  };

  const selectedTask = allTasks.find((task) => task.id === selectedTaskId);

  const handleOpenBidDialog = (taskId: string) => {
    if (!taskId) {
      console.error("Invalid task ID");
      toast.error("Invalid task ID");
      return;
    }
    
        setSelectedTaskId(taskId);
    setBidDialogOpen(true);
  };

  const handleViewTaskDetails = (taskId: string) => {
    if (!taskId) {
      console.error("Invalid task ID");
      toast.error("Invalid task ID");
      return;
    }
    
    // Debug the task ID
               
    
        router.push(`/doer/tasks/${taskId}`);
    toast.info("Viewing task details", {
      description: `Task ID: ${taskId}`
    });
  };

  const handleBidSubmit = async (bidData: { taskId: string; bidContent: string; bidAmount: number }): Promise<void> => {
    try {
      if (!user?.id) {
        toast.error("You must be logged in to place a bid");
        return;
      }
      
      // Log detailed information
                              
      if (!bidData.bidContent?.trim()) {
        toast.error("Please provide details for your bid");
        return;
      }
      
      if (!bidData.bidAmount || bidData.bidAmount <= 0) {
        toast.error("Please enter a valid bid amount");
        return;
      }
      
            
      const result = await submitBid(user.id, bidData.taskId, bidData.bidContent, bidData.bidAmount);
            
      if (!result || !result.success) {
        const errorMessage = result?.error || "Failed to submit bid";
        throw new Error(errorMessage);
      }
      
      toast.success("Bid submitted successfully!");
      setBidDialogOpen(false);
    } catch (error) {
      console.error("Error submitting bid:", error);
      throw error; // Re-throw to let the dialog component handle it
    }
  };

  return (
    <DashboardLayout navItems={doerNavItems} userRole="doer" userName={user?.fullName || ""}>
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Available Tasks</h1>
        </div>

        {/* Filters Section - Top for screens < 1400px, side for larger screens */}
        <div className="grid gap-6 2xl:grid-cols-4 w-full">
          <div className="2xl:col-span-1 order-1 2xl:order-1">
            <div className="2xl:sticky 2xl:top-20 space-y-6 rounded-lg border p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-1 gap-4">
                <div>
                  <h3 className="mb-2 font-medium">Search</h3>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="search" 
                      placeholder="Search tasks..." 
                      className="pl-8" 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 font-medium">Categories</h3>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="essay">Essay Writing</SelectItem>
                      <SelectItem value="research">Research Paper</SelectItem>
                      <SelectItem value="programming">Programming</SelectItem>
                      <SelectItem value="math">Mathematics</SelectItem>
                      <SelectItem value="science">Science</SelectItem>
                      <SelectItem value="data">Data Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className="mb-2 font-medium">Budget Range</h3>
                  <Select value={budgetRange} onValueChange={setBudgetRange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Budgets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Budgets</SelectItem>
                      <SelectItem value="0-1000">Rs.0 - Rs.1000</SelectItem>
                      <SelectItem value="1000-5000">Rs.1000 - Rs.5000</SelectItem>
                      <SelectItem value="5000+">Rs.5000+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className="mb-2 font-medium">Deadline</h3>
                  <Select value={deadline} onValueChange={setDeadline}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Any Deadline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any Deadline</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className="mb-2 font-medium">Sort By</h3>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Newest First" />
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

              <Button 
                className="w-full" 
                onClick={handleApplyFilters} 
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying Filters...
                  </>
                ) : "Apply Filters"}
              </Button>
            </div>
          </div>

          {/* Tasks Grid - Full width for screens < 1400px, 3 columns for larger screens */}
          <div className="2xl:col-span-3 order-2 2xl:order-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Loading available tasks...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <h3 className="mb-2 text-xl font-medium">No Tasks Found</h3>
                <p className="text-muted-foreground">
                  {loading
                    ? "Loading available tasks..."
                    : "There are no available tasks matching your filters."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    id={task.id}
                    title={task.title}
                    description={task.description}
                    category={task.category}
                    budget={task.budget}
                    deadline={task.deadline}
                    status="open"
                    bidsCount={task.bidsCount}
                    posterName="Client"
                    viewType="doer"
                    attachments={task.attachments}
                    userHasBid={task.userHasBid}
                    onPlaceBid={() => handleOpenBidDialog(task.id)}
                    onViewDetails={() => handleViewTaskDetails(task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        {selectedTask && (
          <PlaceBidDialog
            open={bidDialogOpen}
            onOpenChange={setBidDialogOpen}
            taskId={selectedTask.id}
            taskTitle={selectedTask.title}
            taskBudget={selectedTask.budget}
            taskDeadline={selectedTask.deadline.toString()}
            onSubmit={handleBidSubmit}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

