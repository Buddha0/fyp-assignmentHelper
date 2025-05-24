"use server"

import prisma from "@/lib/db"
import { auth } from "@clerk/nextjs/server"
import { isAdmin } from "@/actions/user-role"


/**
 * Get all users with pagination and optional filtering
 */
export async function getAllUsers(page = 1, limit = 20, filters?: {
  role?: 'POSTER' | 'DOER' | 'ADMIN',
  verificationStatus?: string,
  search?: string
}) {
  try {
    // Check if the current user is an admin
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: "Unauthorized" }
    }

    const isUserAdmin = await isAdmin(userId)
    if (!isUserAdmin) {
      return { success: false, error: "Unauthorized, admin access required" }
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Build the filter object
    const where: any = {}
    
    if (filters?.role) {
      where.role = filters.role
    }
    
    if (filters?.verificationStatus) {
      where.verificationStatus = filters.verificationStatus
    }
    
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    return {
      success: true,
      data: {
        users: users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          verificationStatus: user.verificationStatus,
          createdAt: user.createdAt,
          rating: user.rating
        })),
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
          totalCount
        }
      }
    }
  } catch (error) {
    console.error("Error fetching users:", error)
    return { success: false, error: "Failed to fetch users" }
  }
}

/**
 * Get a specific user's details
 */
export async function getUserDetails(userId: string) {
  try {
    // Check if the current user is an admin
    const { userId: adminId } = await auth()
    if (!adminId) {
      return { success: false, error: "Unauthorized" }
    }

    const isUserAdmin = await isAdmin(adminId)
    if (!isUserAdmin) {
      return { success: false, error: "Unauthorized, admin access required" }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            postedAssignments: true,
            acceptedAssignments: true,
            reviews: true,
            receivedReviews: true,
            supportSessions: true,
            disputes: true,
            bids: true
          }
        }
      }
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    return { success: true, data: user }
  } catch (error) {
    console.error("Error fetching user details:", error)
    return { success: false, error: "Failed to fetch user details" }
  }
} 