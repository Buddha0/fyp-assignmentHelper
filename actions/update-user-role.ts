'use server'

import prisma from "@/lib/db"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"

interface UpdateRoleParams {
  newRole: Role
}

export async function updateUserRole({ newRole }: UpdateRoleParams) {
  try {
    // Get the current user
    const { userId } = await auth()
    
    if (!userId) {
      return { 
        success: false, 
        error: "You need to be logged in to switch roles" 
      }
    }
    
    // Update the user's role in our database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        role: true,
        name: true
      }
    })
    
    // Update the user's role in Clerk using the same approach as in the webhook handler
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(userId, {
        publicMetadata: { role: newRole }
      });
      console.log(`Updated user role to ${newRole} for user ${userId}`);
    } catch (error) {
      console.error('Error updating Clerk metadata:', error);
      // Continue even if Clerk update fails
      return {
        success: true,
        data: updatedUser,
        warning: "Role switched but profile may need to be refreshed",
        message: `Successfully switched to ${newRole.toLowerCase()} role`
      }
    }
    
    // Revalidate dashboard paths
    revalidatePath('/doer')
    revalidatePath('/poster')
    
    return {
      success: true,
      data: updatedUser,
      message: `Successfully switched to ${newRole.toLowerCase()} role`
    }
  } catch (error) {
    console.error("Error updating user role:", error)
    return {
      success: false,
      error: "Failed to update your role. Please try again."
    }
  }
} 