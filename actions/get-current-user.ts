"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/lib/db"

export async function getCurrentUser() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return null
    }
    
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      }
    })
    
    return user
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
} 