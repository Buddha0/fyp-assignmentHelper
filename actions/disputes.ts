"use server"

import prisma from "@/lib/db";
import { EVENT_TYPES, getTaskChannel, pusherServer } from "@/lib/pusher";
import { DisputeStatus } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/actions/utility/user-utilit";
import { createNotification } from "@/actions/notifications";

export async function createDisputeWithAuth(
  assignmentId: string,
  initiatorId: string,
  reason: string,
  evidence?: { url: string; name: string; type: string }[]
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    // Authenticate the request
    const authResult = await auth();
    const userId = authResult.userId;
    
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized"
      };
    }

    // Validate the request
    if (!assignmentId || !initiatorId || !reason) {
      return {
        success: false,
        error: "Missing required fields"
      };
    }

    // Ensure the user can only create disputes for themselves
    if (userId !== initiatorId) {
      return {
        success: false,
        error: "You can only create disputes for yourself"
      };
    }

    // Create the dispute
    return await createDispute(assignmentId, initiatorId, reason, evidence);
  } catch (error) {
    console.error("Error creating dispute:", error);
    return {
      success: false,
      error: "An unexpected error occurred"
    };
  }
}

export async function createDispute(
  assignmentId: string,
  initiatorId: string,
  reason: string,
  evidence?: { url: string; name: string; type: string }[]
) {
  try {
    // Check if there's already an active dispute for this assignment
    const existingDispute = await prisma.dispute.findFirst({
      where: {
        assignmentId: assignmentId,
        status: "OPEN",
      },
      select: {
        id: true,
      },
    });

    if (existingDispute) {
      return {
        success: false,
        error: "There is already an active dispute for this assignment.",
      };
    }

    // First check if there's already a payment for this assignment
    const payment = await prisma.payment.findFirst({
      where: {
        assignmentId: assignmentId,
      },
    });

    if (!payment) {
      return {
        success: false,
        error: "No payment found for this assignment. A dispute cannot be created.",
      };
    }

    // Get assignment details first to determine the other party
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { 
        title: true,
        posterId: true,
        doerId: true,
        status: true
      }
    });
    
    if (!assignment) {
      return {
        success: false,
        error: "Assignment not found.",
      };
    }
    
    // Check if the task is already completed
    if (assignment.status === "COMPLETED") {
      return {
        success: false,
        error: "Disputes cannot be raised for completed tasks."
      };
    }

    // Check if payment was already released or refunded
    if (payment.status === "RELEASED" || payment.status === "REFUNDED") {
      return {
        success: false,
        error: "This task has been finalized and payment has been processed. Disputes cannot be raised."
      };
    }
    
    // Create the dispute directly without a transaction
    const dispute = await prisma.dispute.create({
      data: {
        reason,
        evidence: evidence || [],
        status: "OPEN",
        assignment: {
          connect: { id: assignmentId },
        },
        payment: {
          connect: { id: payment.id },
        },
        initiator: {
          connect: { id: initiatorId },
        },
      },
      include: {
        assignment: true,
        payment: true,
        initiator: true,
      },
    });
    
    // Update assignment status to IN_DISPUTE
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: "IN_DISPUTE" }
    });
    
    // Update payment status to DISPUTED
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "DISPUTED" }
    });
    
    // Determine the other party's ID 
    // (if initiator is poster, then notify doer, and vice versa)
    const otherPartyId = initiatorId === assignment.posterId 
      ? assignment.doerId 
      : assignment.posterId;

    // Create notifications for all relevant parties
    try {
      // Notify the other party
      await createNotification({
        userId: otherPartyId!,
        title: "⚠️ Dispute Raised",
        message: `A dispute has been raised for task: "${assignment.title}". Please review and respond.`,
        type: "DISPUTE",
        link: `/dashboard/disputes/${dispute.id}`
      });

      // Notify all admins
      const adminUsers = await prisma.user.findMany({
        where: {
          role: "ADMIN"
        },
        select: {
          id: true
        }
      });

      // Create notifications for all admin users
      await Promise.all(
        adminUsers.map(admin =>
          createNotification({
            userId: admin.id,
            title: "⚠️ New Dispute Requires Attention",
            message: `A new dispute has been raised for task: "${assignment.title}". Please review and take action.`,
            type: "DISPUTE",
            link: `/dashboard/admin/disputes/${dispute.id}`
          })
        )
      );
    } catch (notificationError) {
      console.error("Error creating dispute notifications:", notificationError);
      // Continue even if notification creation fails
    }

    // Send notification to task channel for real-time updates
    await pusherServer.trigger(
      getTaskChannel(assignmentId),
      EVENT_TYPES.TASK_UPDATED,
      {
        task: {
          id: assignmentId,
          title: assignment.title,
          status: "IN_DISPUTE"
        },
        dispute: {
          id: dispute.id,
          status: "OPEN",
          createdAt: dispute.createdAt
        }
      }
    );

    return {
      success: true,
      data: dispute,
    };
  } catch (error) {
    console.error("Error creating dispute:", error);
    return {
      success: false,
      error: "Failed to create dispute: " + (error instanceof Error ? error.message : String(error)),
    };
  }
}

export async function getAllDisputes(force: boolean = false) {
  try {
    // First, check if there are any disputes in the database at all
    const count = await prisma.dispute.count();
    
    if (count === 0) {
      return {
        success: true,
        data: [],
      };
    }
    
    // If there are disputes, fetch them with relations
    const disputes = await prisma.dispute.findMany({
      include: {
        assignment: {
          include: {
            poster: true,
            doer: true,
          },
        },
        payment: true,
        initiator: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    // If force is true, return all disputes regardless of missing relations
    if (force) {
      return {
        success: true,
        data: disputes,
      };
    }
    
    // Check if any disputes have missing relations that might cause issues in the UI
    const validDisputes = disputes.filter(dispute => 
      dispute.assignment && 
      dispute.assignment.poster && 
      dispute.initiator
    );

    return {
      success: true,
      data: validDisputes,
    };
  } catch (error) {
    console.error("Error fetching disputes:", error);
    return {
      success: false,
      error: "Failed to fetch disputes: " + (error instanceof Error ? error.message : "Unknown error"),
    };
  }
}

export async function getDisputeDetails(disputeId: string) {
  try {
    const authObj = await auth();
    const userId = authObj.userId;
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }
    
    // Get the user from the database
    const user = await getUserById(userId);
    
    if (!user) {
      return { success: false, error: "User not found" };
    }
    
    // Find dispute by ID, ensuring user is authorized to view it
    const dispute = await prisma.dispute.findUnique({
      where: {
        id: disputeId,
      },
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        followups: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
            evidence: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        assignment: {
          include: {
            poster: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            doer: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            submissions: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            bids: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            messages: {
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
                receiver: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },
      },
    });
    
    if (!dispute) {
      return { success: false, error: "Dispute not found" };
    }
    
    // Check if user is related to this dispute
    const isInitiator = dispute.initiatorId === userId;
    const assignment = await prisma.assignment.findUnique({
      where: { id: dispute.assignmentId },
      select: { posterId: true, doerId: true }
    });
    
    if (!assignment) {
      return { success: false, error: "Assignment not found" };
    }
    
    const isPoster = assignment.posterId === userId;
    const isDoer = assignment.doerId === userId;
    const isAdmin = user.role === "ADMIN";
    
    if (!isInitiator && !isPoster && !isDoer && !isAdmin) {
      return { success: false, error: "You do not have permission to view this dispute" };
    }
    
    // Check if the user has already responded
    const hasResponse = dispute.response !== null;
    
    return {
      success: true,
      data: {
        ...dispute,
        hasResponse,
        assignment: { 
          ...dispute.assignment,
          posterId: assignment.posterId,
          doerId: assignment.doerId
        }
      },
    };
    
  } catch (error) {
    console.error("Error fetching dispute details:", error);
    return { success: false, error: "Failed to fetch dispute details" };
  }
}

export async function resolveDispute(
  disputeId: string,
  adminId: string,
  resolution: string,
  status: DisputeStatus
) {
  try {
    // Get the dispute with related payment and assignment
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        payment: true,
        assignment: {
          include: {
            poster: true,
            doer: true,
          },
        },
      },
    });

    if (!dispute) {
      return {
        success: false,
        error: "Dispute not found.",
      };
    }

    if (dispute.status !== "OPEN") {
      return {
        success: false,
        error: "This dispute has already been resolved.",
      };
    }

    // Update the dispute
    const updatedDispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        resolution,
        status,
        resolvedBy: {
          connect: { id: adminId },
        },
      },
      include: {
        assignment: true,
        payment: true,
        resolvedBy: true,
      },
    });

    // Update the assignment status based on dispute resolution
    let assignmentStatus: "COMPLETED" | "CANCELLED" = "COMPLETED";
    
    if (status === "RESOLVED_RELEASE") {
      assignmentStatus = "COMPLETED";
    } else if (status === "RESOLVED_REFUND") {
      assignmentStatus = "CANCELLED";
    }

    await prisma.assignment.update({
      where: { id: dispute.assignmentId },
      data: {
        status: assignmentStatus,
      },
    });

    // Update payment status based on dispute resolution
    let paymentStatus: "COMPLETED" | "REFUNDED" | "RELEASED";
    
    if (status === "RESOLVED_RELEASE") {
      paymentStatus = "RELEASED";
    } else if (status === "RESOLVED_REFUND") {
      paymentStatus = "REFUNDED";
    } else {
      paymentStatus = "REFUNDED"; // Default
    }

    await prisma.payment.update({
      where: { id: dispute.paymentId },
      data: {
        status: paymentStatus,
      },
    });

    // Create notifications for both parties about the resolution
    try {
      // Notify the poster
      await createNotification({
        userId: dispute.assignment.poster.id,
        title: "⚠️ Dispute Resolved",
        message: `The dispute for task "${dispute.assignment.title}" has been resolved. ${status === "RESOLVED_REFUND" ? "Payment has been refunded to you." : "Payment has been released to the doer."}`,
        type: "DISPUTE",
        link: `/dashboard/disputes/${disputeId}`
      });

      // Notify the doer
      if (dispute.assignment.doer) {
        await createNotification({
          userId: dispute.assignment.doer.id,
          title: "⚠️ Dispute Resolved",
          message: `The dispute for task "${dispute.assignment.title}" has been resolved. ${status === "RESOLVED_RELEASE" ? "Payment has been released to you." : "Payment has been refunded to the poster."}`,
          type: "DISPUTE",
          link: `/dashboard/disputes/${disputeId}`
        });
      }
    } catch (notificationError) {
      console.error("Error creating resolution notifications:", notificationError);
      // Continue even if notification creation fails
    }

    // Send real-time update via Pusher
    await pusherServer.trigger(
      getTaskChannel(dispute.assignmentId),
      EVENT_TYPES.TASK_UPDATED,
      {
        task: {
          id: dispute.assignmentId,
          status: assignmentStatus,
        },
        dispute: {
          id: disputeId,
          status,
          updatedAt: updatedDispute.updatedAt,
          resolution,
        },
      }
    );

    return {
      success: true,
      data: updatedDispute,
    };
  } catch (error) {
    console.error("Error resolving dispute:", error);
    return {
      success: false,
      error: "Failed to resolve dispute.",
    };
  }
}

export async function getDisputesDebug() {
  try {
    const disputes = await prisma.dispute.findMany({
      include: {
        assignment: {
          include: {
            poster: {
              select: {
                id: true,
                name: true,
              },
            },
            doer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        payment: true,
        initiator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      data: disputes,
    };
  } catch (error) {
    console.error("Error in getDisputesDebug:", error);
    return {
      success: false,
      error: "Failed to fetch disputes debug information.",
    };
  }
}

export async function isAssignmentInDispute(assignmentId: string) {
  try {
    // Check if there's an open dispute for this assignment
    const dispute = await prisma.dispute.findFirst({
      where: {
        assignmentId: assignmentId,
        status: "OPEN",
      },
      select: {
        id: true,
      },
    });

    return {
      success: true,
      inDispute: !!dispute,
      disputeId: dispute?.id,
    };
  } catch (error) {
    console.error("Error checking dispute status:", error);
    return {
      success: false,
      error: "Failed to check dispute status.",
      inDispute: false,
    };
  }
}

export async function submitDisputeResponse(
  disputeId: string,
  userId: string,
  response: string,
  responseEvidence?: { url: string; name: string; type: string }[]
) {
  try {
    // First check if the dispute exists and is still open
    const dispute = await prisma.dispute.findUnique({
      where: {
        id: disputeId,
        status: "OPEN",
      },
      include: {
        assignment: {
          select: {
            id: true,
            posterId: true,
            doerId: true,
          },
        },
        initiator: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!dispute) {
      return {
        success: false,
        error: "Dispute not found or already resolved.",
      };
    }

    // Check if user is involved in this dispute
    const isInvolved =
      userId === dispute.initiator.id ||
      userId === dispute.assignment.posterId ||
      userId === dispute.assignment.doerId;

    if (!isInvolved) {
      return {
        success: false,
        error: "You are not authorized to respond to this dispute.",
      };
    }

    // Update the dispute with the response
    const updatedDispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        response,
        responseEvidence: responseEvidence || [],
        hasResponse: true,
      },
      include: {
        assignment: true,
        initiator: true,
      },
    });

    return {
      success: true,
      data: updatedDispute,
    };
  } catch (error) {
    console.error("Error submitting dispute response:", error);
    return {
      success: false,
      error: "Failed to submit response.",
    };
  }
}

export async function getUserDisputes(userId: string) {
  try {
    // Find disputes where the user is either the initiator, poster, or doer
    const disputes = await prisma.dispute.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          {
            assignment: {
              OR: [
                { posterId: userId },
                { doerId: userId },
              ],
            },
          },
        ],
      },
      include: {
        assignment: {
          include: {
            poster: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            doer: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
          },
        },
        initiator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Add a flag for UI to show if a response is needed
    const enhancedDisputes = disputes.map(dispute => {
      const isInitiator = dispute.initiatorId === userId;
      const needsResponse = dispute.status === "OPEN" && 
        ((isInitiator && !dispute.response) || 
        (!isInitiator && !dispute.hasResponse));
      
      return {
        ...dispute,
        isInitiator,
        needsResponse
      };
    });

    return {
      success: true,
      data: enhancedDisputes,
    };
  } catch (error) {
    console.error("Error fetching user disputes:", error);
    return {
      success: false,
      error: "Failed to fetch disputes.",
    };
  }
}

export async function addDisputeFollowUp(
  disputeId: string,
  userId: string,
  followUpContent: string,
  additionalEvidence?: { url: string; name: string; type: string }[]
) {
  try {
    // First check if the dispute exists and is still open
    const dispute = await prisma.dispute.findUnique({
      where: {
        id: disputeId,
      },
      include: {
        assignment: {
          select: {
            id: true,
            posterId: true,
            doerId: true,
          },
        },
      },
    });

    if (!dispute) {
      return {
        success: false,
        error: "Dispute not found.",
      };
    }

    // Check if user is involved in this dispute
    const isInvolved =
      userId === dispute.initiatorId ||
      userId === dispute.assignment.posterId ||
      userId === dispute.assignment.doerId;

    if (!isInvolved) {
      return {
        success: false,
        error: "You are not authorized to add follow-up messages to this dispute.",
      };
    }

    // Create a follow-up entry
    const followUp = await prisma.disputeFollowup.create({
      data: {
        message: followUpContent,
        evidence: additionalEvidence ? {
          createMany: {
            data: additionalEvidence.map(evidence => ({
              url: evidence.url,
              name: evidence.name,
              type: evidence.type || 'file'
            }))
          }
        } : undefined,
        dispute: {
          connect: { id: disputeId },
        },
        sender: {
          connect: { id: userId },
        },
      },
      include: {
        sender: true,
      },
    });

    return {
      success: true,
      data: followUp,
    };
  } catch (error) {
    console.error("Error adding dispute follow-up:", error);
    return {
      success: false,
      error: "Failed to add follow-up message.",
    };
  }
}

export async function getDisputeFollowUps(disputeId: string) {
  try {
    // Get follow-ups from the DisputeFollowup table
    const followUps = await prisma.disputeFollowup.findMany({
      where: {
        disputeId: disputeId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
        evidence: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      success: true,
      data: followUps,
    };
  } catch (error) {
    console.error("Error fetching dispute follow-ups:", error);
    return {
      success: false,
      error: "Failed to fetch additional information for this dispute.",
    };
  }
}

// New server action that performs auth for dispute response
export async function submitDisputeResponseWithAuth(
  disputeId: string,
  response: string,
  evidence?: { url: string; name: string; type: string }[]
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    // Authenticate the request
    const authResult = await auth();
    const userId = authResult.userId;
    
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized"
      };
    }

    // Validate the request
    if (!disputeId || !response) {
      return {
        success: false,
        error: "Missing required fields"
      };
    }

    // Submit the dispute response
    return await submitDisputeResponse(disputeId, userId, response, evidence);
  } catch (error) {
    console.error("Error responding to dispute:", error);
    return {
      success: false,
      error: "An unexpected error occurred"
    };
  }
}

// New server action that performs auth for dispute followup
export async function addDisputeFollowUpWithAuth(
  disputeId: string,
  message: string,
  evidence?: { url: string; name: string; type: string }[]
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    // Authenticate the request
    const authResult = await auth();
    const userId = authResult.userId;
    
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized"
      };
    }
    
    // Validate the request
    if (!disputeId || !message) {
      return {
        success: false,
        error: "Dispute ID and message are required"
      };
    }
    
    // Submit follow-up message
    return await addDisputeFollowUp(disputeId, userId, message, evidence);
  } catch (error) {
    console.error("Error adding dispute follow-up:", error);
    return {
      success: false,
      error: "An error occurred while adding the follow-up message"
    };
  }
} 