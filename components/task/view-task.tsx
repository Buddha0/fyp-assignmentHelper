"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { Calendar, Clock, ImageIcon, ListFilter, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import TaskForm from "./task-form"

// Mock data for tasks
const mockTasks = [
    {
        id: 1,
        title: "Design New Landing Page",
        description: "Create a modern and responsive landing page for our product launch",
        dueDate: new Date(2024, 2, 25),
        status: "In Progress",
        images: ["https://www.meistertask.com/_next/image?url=https%3A%2F%2Fa.storyblok.com%2Ff%2F289344%2F2640x900%2F536bd0b3c4%2Fmeistertask_homepage-hero_en.png%2Fm%2F%3Fv%3D2&w=3840&q=75"],
    },
    {
        id: 2,
        title: "Update User Documentation",
        description: "Review and update the user documentation with new features askdlkasjdl ajsd lja ls jasadjaksl jlasjdlasl kjdklajskld asdjlkajsd",
        dueDate: new Date(2024, 2, 28),
        status: "Not Started",
        images: ["https://assets.plan.io/images/blog/what-is-task-management.png"],
    },
    {
        id: 3,
        title: "Bug Fixes for Mobile App",
        description: "Address reported bugs in the mobile application",
        dueDate: new Date(2024, 3, 1),
        status: "Completed",
        images: [
            "https://assets.plan.io/images/blog/what-is-task-management.png",
            "https://www.ntaskmanager.com/wp-content/uploads/2019/01/task-management-skills-blog-header-1.png",
            "https://www.ntaskmanager.com/wp-content/uploads/2019/01/task-management-skills-blog-header-1.png",
        ],
    },
]

type Task = (typeof mockTasks)[0]

function TaskCard({ task }: { task: Task }) {
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "completed":
                return "bg-green-500/10 text-green-500 hover:bg-green-500/20"
            case "in progress":
                return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
            default:
                return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
        }
    }

    const getDueDateColor = (date: Date) => {
        const today = new Date()
        const dueDate = new Date(date)
        if (dueDate < today) {
            return "bg-red-500/10 text-red-500 hover:bg-red-500/20"
        }
        if (dueDate.getTime() - today.getTime() < 3 * 24 * 60 * 60 * 1000) {
            return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
        }
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20"
    }

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }
    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="mb-2">{task.title}</CardTitle>
                        <CardDescription className="line-clamp-2">{task.description}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(task.status)} variant="secondary">
                        {task.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {task.images.length > 0 && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="relative aspect-video cursor-pointer overflow-hidden rounded-lg bg-muted">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={task.images[0] || "/placeholder.svg"}
                                    alt="Task preview"
                                    className="object-cover w-full h-full transition-transform hover:scale-105"
                                />
                                {task.images.length > 1 && (
                                    <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-xs backdrop-blur-sm">
                                        <ImageIcon className="h-3 w-3" />+{task.images.length - 1}
                                    </div>
                                )}
                            </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>{task.title}</DialogTitle>
                                <DialogDescription>{task.description}</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 md:grid-cols-2">
                                {task.images.map((image, index) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        key={index}
                                        src={image || "/placeholder.svg"}
                                        alt={`Task image ${index + 1}`}
                                        className="rounded-lg object-cover w-full aspect-video"
                                    />
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </CardContent>
            <CardFooter className="flex items-center gap-4">
                <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-1" />
                    <Badge className={getDueDateColor(task.dueDate)} variant="secondary">
                        Due {format(task.dueDate, "MMM d, yyyy")}
                    </Badge>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    {format(task.dueDate, "h:mm a")}
                </div>
            </CardFooter>
        </Card>
    )
}

export default function TaskView() {
    const [view, setView] = useState("grid")
    const [filter, setFilter] = useState("all")

    const filteredTasks = mockTasks.filter((task) => {
        if (filter === "all") return true
        return task.status.toLowerCase() === filter.toLowerCase()
    })
    const [isOpen, setIsOpen] = useState(false)

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }

    return (
        <>
            <div className="container mx-auto p-4 max-w-7xl">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <ListFilter className="w-4 h-4" />
                                <Select value={filter} onValueChange={setFilter}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Tasks</SelectItem>
                                        <SelectItem value="not started">Not Started</SelectItem>
                                        <SelectItem value="in progress">In Progress</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Tabs value={view} onValueChange={setView} className="w-[200px]">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="grid">Grid</TabsTrigger>
                                    <TabsTrigger value="list">List</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <Button className="gap-2" onClick={() => setIsOpen(true)}>
                                <Plus className="h-4 w-4" />
                                Create Task
                            </Button>
                        </div>
                    </div>

                    <Tabs value={view} className="w-full">
                        <TabsContent value="grid" className="m-0">
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredTasks.map((task) => (
                                    <TaskCard key={task.id} task={task} />
                                ))}
                            </div>
                        </TabsContent>
                        <TabsContent value="list" className="m-0">
                            <div className="grid gap-4">
                                {filteredTasks.map((task) => (
                                    <TaskCard key={task.id} task={task} />
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
            <TaskForm open={isOpen} setIsOpen={setIsOpen} />
        </>
    )
} 