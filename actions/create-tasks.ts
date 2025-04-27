'use server'

import prisma from "@/lib/db"
import { canCreateTask } from "@/actions/utility/check-verification"

type CreateTaskInput = {
    title: string
    description: string
    category: string
    budget: number
    deadline: Date
    priority: string
    attachments: Array<{ url: string; name: string }> // Updated type
    additional?: string
    posterId: string
}

export async function createTask(data: CreateTaskInput) {
    try {
        if (!data.posterId) {
            throw new Error("User not authenticated")
        }

        // Check if user is verified and can create tasks
        const permissionCheck = await canCreateTask(data.posterId)
        
        if (!permissionCheck.success) {
            return {
                success: false,
                error: permissionCheck.error || "Failed to check permission"
            }
        }
        
        // Cast to include expected properties from canCreateTask
        const taskPermission = permissionCheck as { 
            success: boolean; 
            canCreate?: boolean;
            error?: string; 
        }
        
        if (!taskPermission.canCreate) {
            return {
                success: false,
                error: taskPermission.error || "You don't have permission to create tasks"
            }
        }

        const task = await prisma.assignment.create({
            data: {
                title: data.title,
                description: data.description,
                category: data.category,
                budget: data.budget,
                deadline: data.deadline,
                priority: data.priority,
                attachments: data.attachments,
                additional: data.additional,
                posterId: data.posterId
            },
        })

        return {
            success: true,
            data: task,
            message: `Task "${data.title}" created successfully`
        }
    } catch (error) {
        console.error("Error creating task:", error)
        return {
            success: false,
            error: "Failed to create task. Please try again."
        }
    }
}
