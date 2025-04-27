'use server'

import prisma from "@/lib/db"

// Function to check if a user is verified
export async function checkUserVerification(userId: string) {
    try {
        if (!userId) {
            return {
                success: false,
                error: "User ID is required",
                isVerified: false
            }
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                verificationStatus: true,
                role: true
            }
        })

        if (!user) {
            return {
                success: false,
                error: "User not found",
                isVerified: false
            }
        }

        const isVerified = user.verificationStatus === "verified"

        return {
            success: true,
            isVerified,
            role: user.role,
            message: isVerified 
                ? "User is verified" 
                : "User is not verified. Please upload your citizenship document and wait for admin verification."
        }
    } catch (error) {
        console.error("Error checking user verification status:", error)
        return {
            success: false,
            error: "Failed to check verification status",
            isVerified: false
        }
    }
}

// Function to check task creation permission
export async function canCreateTask(userId: string) {
    try {
        const verificationResult = await checkUserVerification(userId)
        
        if (!verificationResult.success) {
            return verificationResult
        }
        
        // Check if user is verified and has POSTER role
        if (!verificationResult.isVerified) {
            return {
                success: false,
                canCreate: false,
                error: "You must be verified by an admin before creating tasks"
            }
        }
        
        if (verificationResult.role !== "POSTER") {
            return {
                success: false,
                canCreate: false,
                error: "Only verified posters can create tasks"
            }
        }
        
        return {
            success: true,
            canCreate: true
        }
    } catch (error) {
        console.error("Error checking task creation permission:", error)
        return {
            success: false,
            canCreate: false,
            error: "Failed to check permission"
        }
    }
}

// Function to check if user can bid on tasks
export async function canBidOnTask(userId: string) {
    try {
        const verificationResult = await checkUserVerification(userId)
        
        if (!verificationResult.success) {
            return verificationResult
        }
        
        // Check if user is verified and has DOER role
        if (!verificationResult.isVerified) {
            return {
                success: false,
                canBid: false,
                error: "You must be verified by an admin before bidding on tasks"
            }
        }
        
        if (verificationResult.role !== "DOER") {
            return {
                success: false,
                canBid: false,
                error: "Only verified doers can bid on tasks"
            }
        }
        
        return {
            success: true,
            canBid: true
        }
    } catch (error) {
        console.error("Error checking bidding permission:", error)
        return {
            success: false,
            canBid: false,
            error: "Failed to check permission"
        }
    }
} 