"use server"

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

/**
 * Get assignment by ID
 * Can be called by either the poster or doer of the assignment
 */
export async function getAssignmentById(id: string, options?: { doerId?: string, posterId?: string }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate that the requestor is either the doer or poster
    const doerId = options?.doerId;
    const posterId = options?.posterId;

    if (!doerId && !posterId) {
      return { success: false, error: "Missing required parameters" };
    }

    const whereClause: any = {
      id,
    };

    // Add the appropriate filter based on who is requesting
    if (doerId) {
      whereClause.doerId = doerId;
    } else if (posterId) {
      whereClause.posterId = posterId;
    }

    const assignment = await prisma.assignment.findUnique({
      where: whereClause,
      include: {
        poster: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        doer: doerId ? {
          select: {
            id: true,
            name: true,
            image: true,
          },
        } : undefined,
      },
    });

    if (!assignment) {
      return { success: false, error: "Assignment not found" };
    }

    return { success: true, assignment };
  } catch (error) {
    console.error("Error fetching assignment:", error);
    return { success: false, error: "Internal server error" };
  }
} 