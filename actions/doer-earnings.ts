"use server"

import prisma from "@/lib/db";
import { PaymentStatus } from "@prisma/client";

export interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  disputedEarnings: number;
  completedEarnings: number;
}

export interface EarningDetail {
  id: string;
  taskTitle: string;
  amount: number;
  status: PaymentStatus;
  taskId: string;
  taskStatus: string;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * Get the earnings summary for a doer
 */
export async function getDoerEarningsSummary(userId: string): Promise<EarningsSummary> {
  const payments = await prisma.payment.findMany({
    where: {
      receiverId: userId,
    },
    select: {
      amount: true,
      status: true,
    }
  });

  // Calculate totals for each category
  const pendingEarnings = payments
    .filter(payment => payment.status === PaymentStatus.PENDING)
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  const disputedEarnings = payments
    .filter(payment => payment.status === PaymentStatus.DISPUTED)
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  const completedEarnings = payments
    .filter(payment => payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.RELEASED)
    .reduce((sum, payment) => sum + payment.amount, 0);

  // Total earnings should be the sum of completed earnings only
  // We don't count pending or disputed as "earned" until they're completed
  const totalEarnings = completedEarnings;

  return {
    totalEarnings,
    pendingEarnings,
    disputedEarnings,
    completedEarnings
  };
}

/**
 * Get detailed earnings information for a doer
 */
export async function getDoerEarningsDetails(userId: string): Promise<EarningDetail[]> {
  const payments = await prisma.payment.findMany({
    where: {
      receiverId: userId,
    },
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      assignment: {
        select: {
          id: true,
          title: true,
          status: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return payments.map(payment => ({
    id: payment.id,
    taskTitle: payment.assignment.title,
    amount: payment.amount,
    status: payment.status,
    taskId: payment.assignment.id,
    taskStatus: payment.assignment.status,
    createdAt: payment.createdAt,
    // Include completedAt date for both COMPLETED and RELEASED statuses
    completedAt: (payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.RELEASED) 
      ? payment.updatedAt : null
  }));
} 