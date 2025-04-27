"use server"

// utils/userUtils.ts
import { clerkClient, auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db"; // Using the default export

// Function to get the current user ID
export async function getUserId() {
  const authObj = await auth();
  const userId = authObj.userId;
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

// Function to update user role in Prisma
export async function updateUserRole(userId: string, role: "POSTER" | "DOER" | "ADMIN") {
  return await prisma.user.upsert({
    where: { id: userId },
    update: { role },
    create: { id: userId, role },
  });
}

// Function to update Clerk metadata
export async function updateClerkMetadata(userId: string, role: "POSTER" | "DOER" | "ADMIN") {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { role },
  });
}

// Get user by ID from the database
export async function getUserById(userId: string) {
  if (!userId) return null;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    return user;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return null;
  }
}
