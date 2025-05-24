'use server'

import prisma from "@/lib/db"
import { AssignmentStatus } from "@prisma/client"
import { pusherServer, getUserChannel, getTaskChannel, getBidChannel, EVENT_TYPES } from "@/lib/pusher"
import { createNotification } from "@/actions/notifications"
import { isAssignmentInDispute } from "@/actions/disputes"

export async function getUserTasks(userId: string) {
    try {
        const tasks = await prisma.assignment.findMany({
            where: {
                posterId: userId
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                doer: {
                    select: {
                        name: true
                    }
                },
                messages: {
                    select: {
                        id: true
                    }
                },
                bids: {
                    select: {
                        id: true
                    }
                },
                submissions: {
                    select: {
                        id: true
                    }
                }
            }
        })

        return {
            success: true,
            data: tasks.map(task => ({
                ...task,
                doerName: task.doer?.name || undefined,
                messagesCount: task.messages.length,
                bidsCount: task.status === 'OPEN' ? task.bids.length : undefined,
                submissionsCount: task.submissions.length,
            }))
        }
    } catch (error) {
        console.error("Error fetching tasks:", error)
        return {
            success: false,
            error: "Failed to fetch tasks"
        }
    }
}

export async function getTaskDetails(taskId: string, userId: string) {
    try {
                
        if (!taskId || !userId) {
            return {
                success: false,
                error: "Task ID and User ID are required"
            }
        }

        const task = await prisma.assignment.findUnique({
            where: {
                id: taskId,
                posterId: userId,
            },
            include: {
                doer: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        rating: true,
                        bio: true
                    }
                },
                bids: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                rating: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                messages: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                name: true,
                                image: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                submissions: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                rating: true
                            }
                        }
                    }
                },
                payment: true // Include payment information
            }
        });

        if (!task) {
            return {
                success: false,
                error: "Task not found"
            }
        }

      

        // Process submissions to ensure attachments are properly formatted
        const processedSubmissions = task.submissions.map(sub => {
            // Ensure attachments is an array of objects with url, name, type
            let attachments = [];
            
            if (sub.attachments) {
                try {
                    // If it's a string, try to parse it as JSON
                    if (typeof sub.attachments === 'string') {
                        try {
                            attachments = JSON.parse(sub.attachments);
                        } catch (e) {
                            console.error(`Failed to parse attachments string for submission ${sub.id}:`, e);
                            // If parsing fails, treat as a single URL
                            attachments = [{
                                url: sub.attachments,
                                name: sub.attachments.split('/').pop() || 'Attachment',
                                type: 'application/octet-stream'
                            }];
                        }
                    } 
                    // If it's already an array, use it directly
                    else if (Array.isArray(sub.attachments)) {
                        attachments = sub.attachments;
                    } 
                    // If it's an object, wrap it in an array
                    else if (typeof sub.attachments === 'object') {
                        attachments = [sub.attachments];
                    }
                    
                    // Ensure each attachment has the required fields
                    attachments = attachments.map((att: any) => {
                        // Check if this is a nested structure with fileUrls
                        if (att && typeof att === 'object' && 'fileUrls' in att) {
                            try {
                                const fileData = JSON.parse(att.fileUrls);
                                return Array.isArray(fileData) ? fileData : [fileData];
                            } catch (e) {
                                console.error("Failed to parse fileUrls:", e);
                                return {
                                    url: att.fileUrls || '',
                                    name: 'Attachment',
                                    type: 'application/octet-stream'
                                };
                            }
                        }
                        
                        // Normal attachment object
                        const url = att.url || att.ufsUrl || (typeof att === 'string' ? att : '');
                        return {
                            url,
                            name: att.name || (url ? url.split('/').pop() : 'Attachment'),
                            type: att.type || 'application/octet-stream'
                        };
                    });
                    
                    // Flatten in case we have nested arrays
                    attachments = attachments.flat().filter((att: any) => att && att.url);
                    
                } catch (e) {
                    console.error(`Error processing attachments for submission ${sub.id}:`, e, sub.attachments);
                    attachments = [];
                }
            }
            
                        
            return {
                id: sub.id,
                content: sub.content,
                status: sub.status,
                createdAt: sub.createdAt,
                attachments,
                user: {
                    id: sub.user.id,
                    name: sub.user.name,
                    image: sub.user.image,
                    rating: sub.user.rating
                }
            };
        });

        return {
            success: true,
            data: {
                ...task,
                doerInfo: task.doer ? {
                    id: task.doer.id,
                    name: task.doer.name,
                    image: task.doer.image,
                    rating: task.doer.rating,
                    bio: task.doer.bio
                } : null,
                messages: task.messages.map(msg => ({
                    id: msg.id,
                    content: msg.content,
                    createdAt: msg.createdAt,
                    sender: {
                        id: msg.sender.id,
                        name: msg.sender.name,
                        image: msg.sender.image
                    }
                })),
                bids: task.bids.map(bid => ({
                    id: bid.id,
                    content: bid.content,
                    bidAmount: bid.bidAmount,
                    status: bid.status,
                    createdAt: bid.createdAt,
                    user: {
                        id: bid.user.id,
                        name: bid.user.name,
                        image: bid.user.image,
                        rating: bid.user.rating
                    }
                })),
                submissions: processedSubmissions,
                payment: task.payment // Include payment in the returned data
            }
        }
    } catch (error) {
        console.error("Error fetching task details:", error)
        return {
            success: false,
            error: "Failed to fetch task details"
        }
    }
}

// Function getTaskProgress removed - no longer tracking progress

export async function deleteTask(taskId: string, userId: string) {
    try {
        const task = await prisma.assignment.findUnique({
            where: {
                id: taskId,
                posterId: userId,
            },
        });

        if (!task) {
            return { success: false, error: "Task not found" };
        }

        // Only allow deletion if the task is in OPEN status
        if (task.status !== "OPEN") {
            return { 
                success: false, 
                error: "Cannot delete a task that is already in progress or completed" 
            };
        }

        await prisma.assignment.delete({
            where: {
                id: taskId,
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Error deleting task:", error);
        return { success: false, error: "Failed to delete task" };
    }
}

export async function updateTask(
    taskId: string, 
    userId: string, 
    data: {
        title: string;
        description: string;
        category: string;
        budget: number;
        deadline: Date;
        attachments?: any;
    }
) {
    try {
        // Find the task and include bids to check if any exist
        const task = await prisma.assignment.findUnique({
            where: {
                id: taskId,
                posterId: userId,
            },
            include: {
                bids: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!task) {
            return { success: false, error: "Task not found" };
        }

        // Only allow updates if the task is in OPEN status
        if (task.status !== "OPEN") {
            return { 
                success: false, 
                error: "Cannot update a task that is already in progress or completed" 
            };
        }

        // Check if there are any bids on the task
        if (task.bids && task.bids.length > 0) {
            return {
                success: false,
                error: "Cannot update a task that already has bids from doers"
            };
        }

        const updatedTask = await prisma.assignment.update({
            where: {
                id: taskId,
            },
            data: {
                title: data.title,
                description: data.description,
                category: data.category,
                budget: data.budget,
                deadline: data.deadline,
                attachments: data.attachments || task.attachments,
            },
        });

        return { success: true, data: updatedTask };
    } catch (error) {
        console.error("Error updating task:", error);
        return { success: false, error: "Failed to update task" };
    }
}

export async function submitBid(userId: string, taskId: string, bidContent: string, bidAmount: number) {
        
    if (!userId || !taskId) {
        console.error("Missing required fields:", { userId, taskId });
        return {
            success: false,
            error: "User ID and Task ID are required"
        };
    }

    if (!bidContent || bidContent.trim() === '') {
        return {
            success: false,
            error: "Bid content is required"
        };
    }

    if (!bidAmount || isNaN(bidAmount) || bidAmount <= 0) {
        return {
            success: false,
            error: "A valid bid amount is required"
        };
    }
    
    try {
        // Check if task exists and is open
        const task = await prisma.assignment.findUnique({
            where: {
                id: taskId,
                status: 'OPEN'
            },
            include: {
                poster: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!task) {
                        return {
                success: false,
                error: "Task not found or is no longer accepting bids"
            };
        }

        // Prevent users from bidding on their own tasks
        if (task.posterId === userId) {
            return {
                success: false,
                error: "You cannot bid on your own task"
            };
        }

        // Check if user has already placed a bid
        const existingBid = await prisma.bid.findFirst({
            where: {
                userId: userId,
                assignmentId: taskId
            }
        });

        if (existingBid) {
                        return {
                success: false,
                error: "You have already placed a bid on this task"
            };
        }

        
        // Get the user's name for the notification
        const bidder = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true }
        });

        // Create the bid
        const bid = await prisma.bid.create({
            data: {
                content: bidContent,
                bidAmount: bidAmount,
                status: "pending",
                userId,
                assignmentId: taskId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        rating: true
                    }
                },
                assignment: {
                    select: {
                        title: true
                    }
                }
            }
        });
        
        
        // Send real-time notification to the task poster
        if (task.posterId) {
            console.log('Sending notification to poster:', task.posterId);
            
            // Create a notification in the database
            try {
                console.log('Creating notification in database');
                const notificationResult = await createNotification({
                    userId: task.posterId,
                    title: "New Bid Received",
                    message: `${bidder?.name || 'A Doer'} has placed a bid of Rs ${bidAmount} on your task: ${task.title}`,
                    type: "new_bid",
                    link: `/poster/tasks/${taskId}`
                });
                
                if (notificationResult.success && notificationResult.data) {
                    console.log('Notification created successfully:', notificationResult.data);
                    // Send real-time notification through Pusher with properly formatted data
                    const notification = Array.isArray(notificationResult.data) 
                        ? notificationResult.data[0] 
                        : notificationResult.data;

                    if (notification) {
                        console.log('Sending Pusher notification with data:', {
                            channel: getUserChannel(task.posterId),
                            event: EVENT_TYPES.NEW_NOTIFICATION,
                            data: {
                                id: notification.id,
                                title: notification.title,
                                message: notification.message,
                                type: notification.type,
                                isRead: notification.isRead,
                                createdAt: notification.createdAt,
                                linkUrl: notification.link,
                                sourceId: bid.id,
                                sourceType: 'bid'
                            }
                        });
                        await pusherServer.trigger(
                            getUserChannel(task.posterId),
                            EVENT_TYPES.NEW_NOTIFICATION,
                            {
                                id: notification.id,
                                title: notification.title,
                                message: notification.message,
                                type: notification.type,
                                isRead: notification.isRead,
                                createdAt: notification.createdAt,
                                linkUrl: notification.link,
                                sourceId: bid.id,
                                sourceType: 'bid'
                            }
                        );
                        console.log('Pusher notification sent successfully');
                    } else {
                        console.error('Notification data is null or undefined');
                    }
                } else {
                    console.error("Failed to create notification:", notificationResult.error);
                }
            } catch (notificationError) {
                console.error("Error creating notification:", notificationError);
                // We don't want to fail the bid creation if notification fails
                // So we just log the error and continue
            }
        }

        return {
            success: true,
            data: bid
        };
    } catch (error) {
        console.error("Error submitting bid:", error);
        
        // Check for specific Prisma errors
        const errorMessage = error instanceof Error ? error.message : "Failed to submit bid";
        
        if (errorMessage.includes("foreign key constraint")) {
            return {
                success: false,
                error: "Invalid user or task ID"
            };
        }
        
        // Return a properly structured error response
        return {
            success: false,
            error: errorMessage
        };
    }
}

export async function getAvailableTasks(userId?: string) {
    try {
        // Fetch all open tasks
        const tasks = await prisma.assignment.findMany({
            where: {
                status: 'OPEN',
                // Exclude tasks where the user is the poster
                ...(userId ? { NOT: { posterId: userId } } : {})
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                bids: {
                    select: {
                        id: true,
                        userId: true,
                    }
                }
            }
        });

        // Transform data for client
        const transformedTasks = tasks.map(task => {
            const userHasBid = userId ? task.bids.some(bid => bid.userId === userId) : false;
            
            return {
                id: task.id,
                title: task.title,
                description: task.description,
                category: task.category,
                budget: task.budget,
                deadline: task.deadline,
                status: task.status.toLowerCase(),
                bidsCount: task.bids.length,
                createdAt: task.createdAt,
                userHasBid: userHasBid,
                attachments: task.attachments
            }
        });

        return {
            success: true,
            data: transformedTasks
        }
    } catch (error) {
        console.error("Error fetching available tasks:", error);
        return {
            success: false,
            error: "Failed to fetch available tasks"
        }
    }
}

export async function getUserBids(userId: string) {
    try {
        if (!userId) {
            return {
                success: false,
                error: "User ID is required"
            };
        }

        // Fetch all bids made by the user
        const bids = await prisma.bid.findMany({
            where: {
                userId: userId,
                OR: [
                    // Include accepted bids where this user is the doer
                    {
                        status: "accepted",
                        assignment: {
                            doerId: userId
                        }
                    },
                    // Include pending bids for open tasks
                    {
                        status: "pending",
                        assignment: {
                            status: "OPEN"
                        }
                    },
                    // Include rejected bids (for history)
                    {
                        status: "rejected"
                    }
                ]
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                assignment: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        category: true,
                        budget: true,
                        deadline: true,
                        status: true,
                        createdAt: true,
                        doerId: true,
                        poster: {
                            select: {
                                id: true,
                                name: true,
                                image: true
                            }
                        }
                    }
                }
            }
        });

        
        // Transform the data for the client
        return {
            success: true,
            data: bids.map(bid => {
                return {
                    id: bid.id,
                    status: bid.status,
                    bidAmount: bid.bidAmount,
                    bidDescription: bid.content,
                    createdAt: bid.createdAt,
                    task: {
                        id: bid.assignment.id,
                        title: bid.assignment.title,
                        description: bid.assignment.description,
                        category: bid.assignment.category,
                        budget: bid.assignment.budget,
                        deadline: bid.assignment.deadline,
                        status: bid.assignment.status,
                        poster: bid.assignment.poster
                    }
                };
            })
        };
    } catch (error) {
        console.error("Error fetching user bids:", error);
        return {
            success: false,
            error: "Failed to fetch bids"
        };
    }
}

export async function withdrawBid(bidId: string, userId: string) {
    try {
        if (!bidId || !userId) {
            return {
                success: false,
                error: "Bid ID and User ID are required"
            };
        }

        // Find the bid and verify ownership
        const bid = await prisma.bid.findUnique({
            where: {
                id: bidId
            }
        });

        if (!bid) {
            return {
                success: false,
                error: "Bid not found"
            };
        }

        if (bid.userId !== userId) {
            return {
                success: false,
                error: "You don't have permission to withdraw this bid"
            };
        }

        if (bid.status !== "pending") {
            return {
                success: false,
                error: "You can only withdraw pending bids"
            };
        }

        // Delete the bid
        await prisma.bid.delete({
            where: {
                id: bidId
            }
        });

        return {
            success: true,
            message: "Bid withdrawn successfully"
        };
    } catch (error) {
        console.error("Error withdrawing bid:", error);
        return {
            success: false,
            error: "Failed to withdraw bid"
        };
    }
}

export async function updateBid() {
    // Feature has been disabled - return error response
    return {
        success: false,
        error: "Bid editing has been disabled. Once a bid is submitted, it cannot be modified. If needed, you can withdraw the bid and create a new one."
    };
}

export async function acceptBid(bidId: string, userId: string) {
    try {
        if (!bidId || !userId) {
            return {
                success: false,
                error: "Bid ID and User ID are required"
            };
        }

        // Find the bid
        const bid = await prisma.bid.findUnique({
            where: {
                id: bidId
            },
            include: {
                assignment: true,
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!bid) {
            return {
                success: false,
                error: "Bid not found"
            };
        }

        // Verify the user is the poster of the task
        if (bid.assignment.posterId !== userId) {
            return {
                success: false,
                error: "You don't have permission to accept this bid"
            };
        }

        // Check if the task is still open
        if (bid.assignment.status !== "OPEN") {
            return {
                success: false,
                error: "This task is no longer open for accepting bids"
            };
        }

        // Prevent users from accepting their own bids (self-completion of tasks)
        if (bid.userId === userId) {
            return {
                success: false,
                error: "You cannot accept your own bid on your own task"
            };
        }

        // Start a transaction to update bid status and task status
        const result = await prisma.$transaction(async (prisma) => {
            // Update the bid status
            const updatedBid = await prisma.bid.update({
                where: {
                    id: bidId
                },
                data: {
                    status: "accepted"
                }
            });

            // Update all other bids for this task to rejected
            await prisma.bid.updateMany({
                where: {
                    assignmentId: bid.assignmentId,
                    id: {
                        not: bidId
                    }
                },
                data: {
                    status: "rejected"
                }
            });

            // Update the task status and assign the doer
            const updatedTask = await prisma.assignment.update({
                where: {
                    id: bid.assignmentId
                },
                data: {
                    status: "ASSIGNED",
                    doerId: bid.userId
                }
            });

            return { updatedBid, updatedTask };
        });

        // Get the name of the user who created the task (poster)
        const poster = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true }
        });

        // Send real-time notification to the doer that their bid was accepted
        try {
                        
            const notificationResult = await createNotification({
                userId: bid.userId,
                title: "Bid Accepted!",
                message: `${poster?.name || 'Client'} has accepted your bid on task: ${bid.assignment.title}`,
                type: "bid_accepted",
                link: `/doer/tasks/${bid.assignmentId}`
            });
            
            if (notificationResult.success) {
                            } else {
                console.error("Failed to create notification:", notificationResult.error);
            }
        } catch (notificationError) {
            console.error("Error creating notification:", notificationError);
            // We don't want to fail the bid acceptance if notification fails
            // So we just log the error and continue
        }

        // Keep sending bid accepted event to the bid channel as it's used for UI updates
        await pusherServer.trigger(
            getBidChannel(bidId),
            EVENT_TYPES.BID_ACCEPTED,
            {
                bid: {
                    id: bidId,
                    status: "accepted"
                },
                task: {
                    id: bid.assignmentId,
                    title: bid.assignment.title,
                    status: "ASSIGNED"
                }
            }
        );

        // Also notify rejected bidders
        const rejectedBids = await prisma.bid.findMany({
            where: {
                assignmentId: bid.assignmentId,
                id: {
                    not: bidId
                },
                status: "rejected"
            },
            select: {
                id: true,
                userId: true
            }
        });

        // Create and send notifications to all rejected bidders
        for (const rejectedBid of rejectedBids) {
            // Keep sending bid rejected event to each bid channel as it's used for UI updates
            await pusherServer.trigger(
                getBidChannel(rejectedBid.id),
                EVENT_TYPES.BID_REJECTED,
                {
                    bid: {
                        id: rejectedBid.id,
                        status: "rejected"
                    }
                }
            );
            
            // Also create a notification for each rejected bidder
            try {
                await createNotification({
                    userId: rejectedBid.userId,
                    title: "Bid Not Selected",
                    message: `Your bid on task: "${bid.assignment.title}" was not selected by the client.`,
                    type: "bid_rejected",
                    link: `/doer/bids`
                });
            } catch (notificationError) {
                console.error("Error creating rejection notification:", notificationError);
                // Continue with next notification even if this one fails
            }
        }

        return {
            success: true,
            data: result,
            message: "Bid accepted successfully"
        };
    } catch (error) {
        console.error("Error accepting bid:", error);
        return {
            success: false,
            error: "Failed to accept bid"
        };
    }
}

export async function rejectBid(bidId: string, userId: string) {
    try {
        if (!bidId || !userId) {
            return {
                success: false,
                error: "Bid ID and User ID are required"
            };
        }

        // Find the bid
        const bid = await prisma.bid.findUnique({
            where: {
                id: bidId
            },
            include: {
                assignment: true,
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!bid) {
            return {
                success: false,
                error: "Bid not found"
            };
        }

        // Verify the user is the poster of the task
        if (bid.assignment.posterId !== userId) {
            return {
                success: false,
                error: "You don't have permission to reject this bid"
            };
        }

        // Check if the task is still open
        if (bid.assignment.status !== "OPEN") {
            return {
                success: false,
                error: "This task is no longer open for rejecting bids"
            };
        }

        // Update the bid status
        const updatedBid = await prisma.bid.update({
            where: {
                id: bidId
            },
            data: {
                status: "rejected"
            }
        });

        // Get the poster's name for the notification
        const poster = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true }
        });

        // Send notification to the doer
        try {
            const notificationResult = await createNotification({
                userId: bid.userId,
                title: "Bid Rejected",
                message: `${poster?.name || 'Client'} has rejected your bid on task: ${bid.assignment.title}`,
                type: "bid_rejected",
                link: `/doer/bids`
            });

            if (!notificationResult.success) {
                console.error("Failed to create notification:", notificationResult.error);
            }
        } catch (notificationError) {
            console.error("Error creating notification:", notificationError);
            // We don't want to fail the bid rejection if notification fails
            // So we just log the error and continue
        }

        // Send real-time update via Pusher
        await pusherServer.trigger(
            getBidChannel(bidId),
            EVENT_TYPES.BID_REJECTED,
            {
                bid: {
                    id: bidId,
                    status: "rejected"
                }
            }
        );

        return {
            success: true,
            data: updatedBid,
            message: "Bid rejected successfully"
        };
    } catch (error) {
        console.error("Error rejecting bid:", error);
        return {
            success: false,
            error: "Failed to reject bid"
        };
    }
}

export async function getDoerTaskDetails(taskId: string, userId: string) {
    try {
                
        if (!taskId || !userId) {
            console.error("Missing required parameters:", { taskId, userId });
            return {
                success: false,
                error: "Task ID and User ID are required"
            }
        }

        const task = await prisma.assignment.findUnique({
            where: {
                id: taskId,
                doerId: userId
            },
            include: {
                doer: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        rating: true,
                        bio: true
                    }
                },
                bids: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                rating: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                messages: {
                    include: {
                        sender: {
                            select: {
                                id: true,
                                name: true,
                                image: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                submissions: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                rating: true
                            }
                        }
                    }
                },
                payment: true // Include payment information
            }
        });

        if (!task) {
            return {
                success: false,
                error: "Task not found"
            }
        }

       

        // Process submissions to ensure attachments are properly formatted
        const processedSubmissions = task.submissions.map(sub => {
            // Ensure attachments is an array of objects with url, name, type
            let attachments = [];
            
            if (sub.attachments) {
                try {
                    // If it's a string, try to parse it as JSON
                    if (typeof sub.attachments === 'string') {
                        try {
                            attachments = JSON.parse(sub.attachments);
                        } catch (e) {
                            console.error(`Failed to parse attachments string for submission ${sub.id}:`, e);
                            // If parsing fails, treat as a single URL
                            attachments = [{
                                url: sub.attachments,
                                name: sub.attachments.split('/').pop() || 'Attachment',
                                type: 'application/octet-stream'
                            }];
                        }
                    } 
                    // If it's already an array, use it directly
                    else if (Array.isArray(sub.attachments)) {
                        attachments = sub.attachments;
                    } 
                    // If it's an object, wrap it in an array
                    else if (typeof sub.attachments === 'object') {
                        attachments = [sub.attachments];
                    }
                    
                    // Ensure each attachment has the required fields
                    attachments = attachments.map((att: any) => {
                        // Check if this is a nested structure with fileUrls
                        if (att && typeof att === 'object' && 'fileUrls' in att) {
                            try {
                                const fileData = JSON.parse(att.fileUrls);
                                return Array.isArray(fileData) ? fileData : [fileData];
                            } catch (e) {
                                console.error("Failed to parse fileUrls:", e);
                                return {
                                    url: att.fileUrls || '',
                                    name: 'Attachment',
                                    type: 'application/octet-stream'
                                };
                            }
                        }
                        
                        // Normal attachment object
                        const url = att.url || att.ufsUrl || (typeof att === 'string' ? att : '');
                        return {
                            url,
                            name: att.name || (url ? url.split('/').pop() : 'Attachment'),
                            type: att.type || 'application/octet-stream'
                        };
                    });
                    
                    // Flatten in case we have nested arrays
                    attachments = attachments.flat().filter((att: any) => att && att.url);
                    
                } catch (e) {
                    console.error(`Error processing attachments for submission ${sub.id}:`, e, sub.attachments);
                    attachments = [];
                }
            }
            
                        
            return {
                id: sub.id,
                content: sub.content,
                status: sub.status,
                createdAt: sub.createdAt,
                attachments,
                user: {
                    id: sub.user.id,
                    name: sub.user.name,
                    image: sub.user.image,
                    rating: sub.user.rating
                }
            };
        });

        return {
            success: true,
            data: {
                ...task,
                doerInfo: task.doer ? {
                    id: task.doer.id,
                    name: task.doer.name,
                    image: task.doer.image,
                    rating: task.doer.rating,
                    bio: task.doer.bio
                } : null,
                messages: task.messages.map(msg => ({
                    id: msg.id,
                    content: msg.content,
                    createdAt: msg.createdAt,
                    sender: {
                        id: msg.sender.id,
                        name: msg.sender.name,
                        image: msg.sender.image
                    }
                })),
                bids: task.bids.map(bid => ({
                    id: bid.id,
                    content: bid.content,
                    bidAmount: bid.bidAmount,
                    status: bid.status,
                    createdAt: bid.createdAt,
                    user: {
                        id: bid.user.id,
                        name: bid.user.name,
                        image: bid.user.image,
                        rating: bid.user.rating
                    }
                })),
                submissions: processedSubmissions,
                payment: task.payment // Include payment in the returned data
            }
        }
    } catch (error) {
        console.error("Error fetching doer task details:", error);
        return {
            success: false,
            error: "Failed to fetch doer task details"
        }
    }
}

export async function createTaskSubmission(
    taskId: string,
    userId: string,
    content: string,
    attachments: Array<{ url: string; name: string; type: string }>
) {
    try {
        if (!taskId || !userId) {
            return {
                success: false,
                error: "Missing required parameters"
            }
        }

        // Verify the user has access to this task
        const task = await prisma.assignment.findFirst({
            where: {
                id: taskId,
                doerId: userId
            },
            select: {
                id: true,
                title: true,
                posterId: true,
                status: true
            }
        })

        if (!task) {
            return {
                success: false,
                error: "Task not found or access denied"
            }
        }

        // Check if the task is in dispute
        const disputeStatus = await isAssignmentInDispute(taskId);
        if (disputeStatus.success && disputeStatus.inDispute) {
            return {
                success: false,
                error: "Submissions are restricted while this task is in dispute"
            };
        }

        // Check if the task is completed
        if (task.status === "COMPLETED") {
            return {
                success: false,
                error: "Submissions are not allowed for completed tasks"
            };
        }

        // Check if the task had a dispute that was resolved (payment released or refunded)
        const payment = await prisma.payment.findFirst({
            where: {
                assignmentId: taskId,
                status: {
                    in: ["RELEASED", "REFUNDED"]
                }
            }
        });

        if (payment) {
            return {
                success: false,
                error: "This task has been finalized and submissions are no longer allowed"
            };
        }

        // Prepare file data if provided
        // ... rest of the function

        // Check if the task exists and the user is the assigned doer
        const taskExists = await prisma.assignment.findUnique({
            where: {
                id: taskId,
                doerId: userId,
            },
            include: {
                poster: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                doer: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!taskExists) {
            return {
                success: false,
                error: "Task not found or you are not the assigned doer"
            };
        }

        // Create the submission
        const submission = await prisma.submission.create({
            data: {
                content,
                attachments,
                status: "pending",
                assignmentId: taskId,
                userId
            }
        });

        // Update the task status to UNDER_REVIEW if it's not already completed
        if (taskExists.status !== "COMPLETED") {
            await prisma.assignment.update({
                where: { id: taskId },
                data: { status: "UNDER_REVIEW" }
            });
        }

        // Send real-time notification to the task poster
        if (taskExists.poster?.id) {
            // Send more complete task data for UI updates
            await pusherServer.trigger(
                getTaskChannel(taskId),
                EVENT_TYPES.TASK_UPDATED,
                {
                    submission: {
                        id: submission.id,
                        status: submission.status,
                        createdAt: submission.createdAt,
                        content: content.substring(0, 100) // Send a preview of the content
                    },
                    task: {
                        id: taskId,
                        title: taskExists.title,
                        status: taskExists.status === "IN_PROGRESS" ? "UNDER_REVIEW" : taskExists.status
                    }
                }
            );
            
            // Create a high-priority notification for the poster
            try {
                await createNotification({
                    userId: taskExists.poster.id,
                    title: "⚠️ ACTION REQUIRED: Work Submitted for Review",
                    message: `${taskExists.doer?.name || "A doer"} has submitted their work for your task: "${taskExists.title}". Please review and approve or provide feedback.`,
                    type: "submission_review_required",
                    link: `/poster/tasks/${taskId}`
                });
                
                // Send an additional real-time notification highlighting the need for action
                await pusherServer.trigger(
                    getUserChannel(taskExists.poster.id),
                    EVENT_TYPES.URGENT_NOTIFICATION,
                    {
                        message: `New work submitted for "${taskExists.title}" is waiting for your review`,
                        taskId: taskId,
                        submissionId: submission.id,
                        timestamp: new Date().toISOString()
                    }
                );
            } catch (error) {
                console.error("Error creating notification for submission:", error);
                // Continue even if notification creation fails
            }
        }

        return {
            success: true,
            data: submission,
            message: "Submission created successfully"
        };
    } catch (error) {
        console.error("Error creating task submission:", error);
        return {
            success: false,
            error: "Failed to create submission"
        };
    }
}

export async function updateTaskStatus(
    taskId: string,
    userId: string,
    newStatus: string
) {
    try {
                
        if (!taskId || !userId) {
            return {
                success: false,
                error: "Task ID and User ID are required"
            };
        }

        if (!newStatus) {
            return {
                success: false,
                error: "New status is required"
            };
        }

        // Check if the task exists and the user is the assigned doer
        const task = await prisma.assignment.findUnique({
            where: {
                id: taskId,
                doerId: userId,
            },
            include: {
                poster: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                doer: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!task) {
            return {
                success: false,
                error: "Task not found or you are not the assigned doer"
            };
        }

        // Validate status transition
        if (!isValidStatusTransition(task.status, newStatus)) {
            return {
                success: false,
                error: `Cannot transition from ${task.status} to ${newStatus}`
            };
        }

        // Update the task status
        const updatedTask = await prisma.assignment.update({
            where: { id: taskId },
            data: { status: newStatus as AssignmentStatus }
        });

        // Send real-time notification to the task poster
        if (task.poster?.id) {
            // Send more complete data for better real-time updates
            await pusherServer.trigger(
                getTaskChannel(taskId),
                EVENT_TYPES.TASK_UPDATED,
                {
                    task: {
                        id: taskId,
                        title: task.title,
                        status: newStatus
                    },
                    updateType: "status_change",
                    updatedBy: {
                        id: userId,
                        name: task.doer?.name || "Doer"
                    }
                }
            );
            
            // Also create a notification for the poster
            try {
                const statusMessages = {
                    "IN_PROGRESS": "has started working on",
                    "UNDER_REVIEW": "has submitted work for",
                    "COMPLETED": "has completed"
                };
                
                const message = statusMessages[newStatus] 
                    ? `${task.doer?.name || "The doer"} ${statusMessages[newStatus]} your task: ${task.title}`
                    : `Status of task "${task.title}" has been updated to ${newStatus.toLowerCase().replace('_', ' ')}`;
                
                await createNotification({
                    userId: task.poster.id,
                    title: `Task Status Updated`,
                    message,
                    type: "status_update",
                    link: `/poster/tasks/${taskId}`
                });
            } catch (error) {
                console.error("Error creating notification for status update:", error);
                // Continue even if notification creation fails
            }
        }

        return {
            success: true,
            data: updatedTask,
            message: `Task status updated to ${newStatus.toLowerCase()}`
        };
    } catch (error) {
        console.error("Error updating task status:", error);
        return {
            success: false,
            error: "Failed to update task status"
        };
    }
}

// Helper function to validate status transitions
function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions = {
        "ASSIGNED": ["IN_PROGRESS"],
        "IN_PROGRESS": ["UNDER_REVIEW"],
        "UNDER_REVIEW": ["COMPLETED", "IN_PROGRESS"]
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
}

/**
 * Update the status of a submission (approve or reject)
 */
export async function updateSubmissionStatus(
    submissionId: string,
    userId: string,
    newStatus: 'approved' | 'rejected'
) {
    try {
        // Check if the submission exists and belongs to a task owned by this user
        const submission = await prisma.submission.findFirst({
            where: {
                id: submissionId,
                assignment: {
                    posterId: userId
                }
            },
            include: {
                assignment: true,
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!submission) {
            return {
                success: false,
                error: "Submission not found or you don't have permission to update it"
            };
        }

        // Update the submission status
        const updatedSubmission = await prisma.submission.update({
            where: {
                id: submissionId
            },
            data: {
                status: newStatus.toUpperCase()
            }
        });

        // If approved, also update the task status to COMPLETED
        if (newStatus === 'approved') {
            await prisma.assignment.update({
                where: {
                    id: submission.assignmentId
                },
                data: {
                    status: 'COMPLETED'
                }
            });

            // Notify the doer that their submission was approved
            await pusherServer.trigger(
                getUserChannel(submission.userId),
                EVENT_TYPES.SUBMISSION_STATUS_UPDATED,
                {
                    message: `Your submission for "${submission.assignment.title}" has been approved!`,
                    submissionId: submission.id,
                    taskId: submission.assignmentId,
                    status: 'APPROVED'
                }
            );
        } else if (newStatus === 'rejected') {
            // If rejected, update the task status back to IN_PROGRESS
            await prisma.assignment.update({
                where: {
                    id: submission.assignmentId
                },
                data: {
                    status: 'IN_PROGRESS'
                }
            });

            // Notify the doer that their submission was rejected
            await pusherServer.trigger(
                getUserChannel(submission.userId),
                EVENT_TYPES.SUBMISSION_STATUS_UPDATED,
                {
                    message: `Your submission for "${submission.assignment.title}" has been rejected. Please make the necessary changes and submit again.`,
                    submissionId: submission.id,
                    taskId: submission.assignmentId,
                    status: 'REJECTED'
                }
            );
        }

        return {
            success: true,
            message: `Submission ${newStatus}`,
            data: updatedSubmission
        };
    } catch (error) {
        console.error(`Error updating submission status to ${newStatus}:`, error);
        return {
            success: false,
            error: `Failed to ${newStatus} submission`
        };
    }
}
