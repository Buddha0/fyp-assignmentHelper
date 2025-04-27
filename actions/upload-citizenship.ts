'use server'

import prisma from "@/lib/db"

type UploadCitizenshipInput = {
    userId: string
    documentUrl: string
    replaceExisting?: boolean // Add option to replace existing photos
}

export async function uploadCitizenshipDocument(data: UploadCitizenshipInput) {
    try {
        if (!data.userId || !data.documentUrl) {
            return {
                success: false,
                error: "User ID and document URL are required"
            }
        }

        // Get the user's current citizenship photos
        const currentUser = await prisma.user.findUnique({
            where: { id: data.userId },
            select: { citizenshipPhotos: true }
        });

        // Create an array of citizenship photos
        let updatedPhotos: string[] = [];
        
        // If replaceExisting is true or not specified, add just this document
        if (data.replaceExisting) {
            updatedPhotos = [data.documentUrl];
        } else {
            // Otherwise append to existing photos
            if (currentUser?.citizenshipPhotos) {
                const existingPhotos = currentUser.citizenshipPhotos as string[];
                // Limit to max 3 photos - if already 3, replace the oldest one
                if (existingPhotos.length >= 3) {
                    updatedPhotos = [...existingPhotos.slice(1), data.documentUrl];
                } else {
                    updatedPhotos = [...existingPhotos, data.documentUrl];
                }
            } else {
                // First photo for this user
                updatedPhotos = [data.documentUrl];
            }
        }

        // Update user's citizenship photos and reset verification status to pending
        const user = await prisma.user.update({
            where: { id: data.userId },
            data: {
                citizenshipPhotos: updatedPhotos,
                verificationStatus: "pending" // Reset to pending for admin review
            },
            select: {
                id: true,
                name: true,
                citizenshipPhotos: true,
                verificationStatus: true
            }
        })

        return {
            success: true,
            data: user,
            message: "Citizenship document uploaded successfully. Please wait for admin verification."
        }
    } catch (error) {
        console.error("Error uploading citizenship document:", error)
        return {
            success: false,
            error: "Failed to upload citizenship document"
        }
    }
}

export async function getUserVerificationStatus(userId: string) {
    try {
        if (!userId) {
            return {
                success: false,
                error: "User ID is required"
            }
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                citizenshipPhotos: true,
                verificationStatus: true,
                rejectionReason: true
            }
        })

        if (!user) {
            return {
                success: false,
                error: "User not found"
            }
        }

        return {
            success: true,
            data: {
                hasDocument: !!user.citizenshipPhotos && (user.citizenshipPhotos as string[]).length > 0,
                verificationStatus: user.verificationStatus,
                documentUrls: user.citizenshipPhotos as string[] || [],
                rejectionReason: user.rejectionReason
            }
        }
    } catch (error) {
        console.error("Error getting verification status:", error)
        return {
            success: false,
            error: "Failed to get verification status"
        }
    }
} 