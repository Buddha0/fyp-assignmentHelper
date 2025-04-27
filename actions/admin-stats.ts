"use server";

import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function getAdminDashboardStats() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Check if user is an admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  // Get total users count
  const totalUsers = await prisma.user.count();

  // Get verified users count
  const verifiedUsers = await prisma.user.count({
    where: {
      verificationStatus: "verified",
    },
  });

  // Get active assignments count (OPEN, ASSIGNED, IN_PROGRESS)
  const activeAssignments = await prisma.assignment.count({
    where: {
      status: {
        in: ["OPEN", "ASSIGNED", "IN_PROGRESS"],
      },
    },
  });

  // Get open disputes count
  const openDisputes = await prisma.dispute.count({
    where: {
      status: "OPEN",
    },
  });

  return {
    totalUsers,
    verifiedUsers,
    activeAssignments,
    openDisputes,
  };
} 