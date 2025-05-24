'use server'

import prisma from "@/lib/db"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"

// Get user role by ID
export async function getUserRole(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    return user?.role || "POSTER"; // Default to POSTER if role not found
  } catch (error) {
    console.error("Error fetching user role:", error);
    return "POSTER"; // Default to POSTER in case of error
  }
}

export async function switchUserRole(newRole: string) {
  try {
    // Get the current user
    const { userId } = await auth()
    
    if (!userId) {
      return { 
        success: false, 
        error: "You need to be logged in to switch roles" 
      }
    }
    
    // Convert string to Role enum
    const roleEnum = newRole as Role;
    
    // Update the user's role in our database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: roleEnum },
      select: {
        id: true,
        role: true,
        name: true
      }
    })
    
    // Update the user's role in Clerk
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(userId, {
        publicMetadata: { role: roleEnum }
      });
    } catch (error) {
      console.error('Error updating Clerk metadata:', error);
      // Continue even if Clerk update fails
      return {
        success: true,
        data: updatedUser,
        warning: "Role switched but profile may need to be refreshed",
      }
    }
    
    // Revalidate all relevant paths
    revalidatePath('/doer', 'layout')
    revalidatePath('/poster', 'layout')
    revalidatePath('/dashboard/doer', 'layout')
    revalidatePath('/dashboard/poster', 'layout')
    revalidatePath('/', 'layout')
    
    return {
      success: true,
      data: updatedUser
    }
  } catch (error) {
    console.error("Error switching user role:", error)
    return {
      success: false,
      error: "Failed to switch your role. Please try again."
    }
  }
}

// Check if user is an admin
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    return user?.role === "ADMIN";
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false; // Default to false in case of error
  }
} 