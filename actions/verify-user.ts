'use server'

import prisma from "@/lib/db"
import { auth } from "@clerk/nextjs/server"
import { createNotification } from "./notifications"

type VerificationStatus = "verified" | "rejected" | "pending"

interface VerifyUserParams {
    userId: string
    status: VerificationStatus
    rejectionReason?: string
}

export async function verifyUser({ userId, status, rejectionReason }: VerifyUserParams) {
    try {
        // Check if the current user is an admin
        const { userId: adminId, sessionClaims } = await auth()
        
        if (!adminId) {
            return { 
                success: false, 
                error: "You need to be logged in to perform this action" 
            }
        }
        
        const userRole = sessionClaims?.metadata?.role
        
        if (userRole !== "ADMIN") {
            return { 
                success: false, 
                error: "Unauthorized. Only admin users can perform this action" 
            }
        }
        
        // Find the user to get their name
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true }
        });
        
        if (!user) {
            return {
                success: false,
                error: "User not found"
            };
        }
        
        const userName = user.name || user.email || "User";
        
        // Prepare data for update
        const updateData: any = { verificationStatus: status }
        
        // Add rejection reason if status is rejected
        if (status === "rejected") {
            updateData.rejectionReason = rejectionReason || null
        } else if (status === "verified") {
            // Clear any previous rejection reason
            updateData.rejectionReason = null
        }
        
        // Update the user's verification status
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        })

        // Create notification for the user about their verification status
        try {
            const notificationData = {
                userId: userId,
                title: status === "verified" ? "Verification Approved" : "Verification Rejected",
                message: status === "verified" 
                    ? "Your account has been verified. You can now access all features."
                    : `Your verification was rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`,
                type: "VERIFICATION",
                link: status === "verified" ? "/dashboard" : "/verification"
            };
            
            await createNotification(notificationData);
        } catch (notificationError) {
            console.error("Error creating verification notification:", notificationError);
            // Continue even if notification fails
        }
        
        return {
            success: true,
            data: updatedUser,
            message: status === "verified" ? "User verified successfully" : "User verification rejected"
        }
    } catch (error) {
        console.error("Error verifying user:", error)
        return {
            success: false,
            error: "Failed to verify user"
        }
    }
}

// Function to get users pending verification
export async function getPendingVerifications() {
    try {
        // Check if the current user is an admin
        const { userId: adminId, sessionClaims } = await auth()
        
        if (!adminId) {
            return { 
                success: false, 
                error: "Not authenticated" 
            }
        }
        
        const userRole = sessionClaims?.metadata?.role
        
        if (userRole !== "ADMIN") {
            return { 
                success: false, 
                error: "Unauthorized. Only admin users can perform this action" 
            }
        }
        
        // Get users with pending verification
        const pendingUsers = await prisma.user.findMany({
            where: { 
                verificationStatus: "pending",
                citizenshipPhotos: {
                    not: {
                        equals: null
                    }
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                citizenshipPhotos: true,
                verificationStatus: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        })
        
        // Transform citizenshipPhotos from JSON to string array
        const transformedUsers = pendingUsers.map(user => ({
            ...user,
            citizenshipPhotos: user.citizenshipPhotos ? (user.citizenshipPhotos as unknown as string[]) : null
        }))
        
        return {
            success: true,
            data: transformedUsers
        }
    } catch (error) {
        console.error("Error getting pending verifications:", error)
        return {
            success: false,
            error: "Failed to get pending verifications"
        }
    }
}

// Function to get verified users
export async function getVerifiedUsers() {
    try {
        // Admin check
        const { userId: adminId, sessionClaims } = await auth()
        
        if (!adminId || sessionClaims?.metadata?.role !== "ADMIN") {
            return { success: false, error: "Unauthorized" }
        }
        
        const verifiedUsers = await prisma.user.findMany({
            where: { verificationStatus: "verified" },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                citizenshipPhotos: true,
                verificationStatus: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        })
        
        // Transform citizenshipPhotos from JSON to string array
        const transformedUsers = verifiedUsers.map(user => ({
            ...user,
            citizenshipPhotos: user.citizenshipPhotos ? (user.citizenshipPhotos as unknown as string[]) : null
        }))
        
        return { success: true, data: transformedUsers }
    } catch (error) {
        console.error("Error getting verified users:", error)
        return { success: false, error: "Failed to get verified users" }
    }
}

// Function to get rejected users
export async function getRejectedUsers() {
    try {
        // Admin check
        const { userId: adminId, sessionClaims } = await auth()
        
        if (!adminId || sessionClaims?.metadata?.role !== "ADMIN") {
            return { success: false, error: "Unauthorized" }
        }
        
        const rejectedUsers = await prisma.user.findMany({
            where: { verificationStatus: "rejected" },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                citizenshipPhotos: true,
                verificationStatus: true,
                rejectionReason: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        })
        
        // Transform citizenshipPhotos from JSON to string array
        const transformedUsers = rejectedUsers.map(user => ({
            ...user,
            citizenshipPhotos: user.citizenshipPhotos ? (user.citizenshipPhotos as unknown as string[]) : null
        }))
        
        return { success: true, data: transformedUsers }
    } catch (error) {
        console.error("Error getting rejected users:", error)
        return { success: false, error: "Failed to get rejected users" }
    }
} 