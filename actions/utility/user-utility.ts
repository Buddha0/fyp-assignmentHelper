"use server";

// utils/userUtils.ts
import { clerkClient, auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

// Function to get the current user ID
// export async function getUserId() {
export async function getUserId() {
  const { userId } = await auth();
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
