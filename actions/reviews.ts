"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

// Create a new review
export async function createReview(
  receiverId: string,
  assignmentId: string, 
  rating: number, 
  comment: string
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if this assignment exists and is completed
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        status: true,
        posterId: true,
        doerId: true
      }
    });

    if (!assignment) {
      return { success: false, error: "Assignment not found" };
    }

    // Check if the current user is either the poster or doer of this assignment
    if (assignment.posterId !== userId && assignment.doerId !== userId) {
      return { success: false, error: "You're not associated with this assignment" };
    }

    // Check if the assignment is completed or in dispute (reviews allowed in these states)
    const allowedStatuses = ["COMPLETED", "IN_DISPUTE"];
    if (!allowedStatuses.includes(assignment.status)) {
      return { 
        success: false, 
        error: "Reviews can only be left for completed assignments" 
      };
    }

    // Check if the receiver is the other party in the assignment
    const isReceiverPoster = receiverId === assignment.posterId;
    const isReceiverDoer = receiverId === assignment.doerId;
    
    if (!isReceiverPoster && !isReceiverDoer) {
      return { 
        success: false, 
        error: "The receiver must be the poster or doer of this assignment" 
      };
    }

    // Check if the reviewer is trying to review themselves
    if (userId === receiverId) {
      return { success: false, error: "You cannot review yourself" };
    }

    // Check if the user has already left a review for this assignment and receiver
    const existingReview = await prisma.review.findFirst({
      where: {
        assignmentId,
        reviewerId: userId,
        receiverId
      }
    });

    if (existingReview) {
      return { success: false, error: "You've already reviewed this user for this assignment" };
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        assignmentId,
        reviewerId: userId,
        receiverId
      }
    });

    // Update the receiver's average rating
    await updateUserRating(receiverId);

    // Revalidate related paths
    revalidatePath(`/poster/profile/${receiverId}`);
    revalidatePath(`/doer/profile/${receiverId}`);

    return { success: true, data: review };
  } catch (error) {
    console.error("Error creating review:", error);
    return { success: false, error: "Failed to create review" };
  }
}

// Fetch reviews for a user
export async function getUserReviews(userId: string) {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        receiverId: userId
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true
          }
        },
        assignment: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return { success: true, data: reviews };
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    return { success: false, error: "Failed to fetch reviews" };
  }
}

// Check if a user can leave a review for another user
export async function canReviewUser(receiverId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { canReview: false, assignments: [] };
    }

    // Find completed assignments where both users participated
    const assignments = await prisma.assignment.findMany({
      where: {
        status: { in: ["COMPLETED", "IN_DISPUTE"] },
        OR: [
          // User is poster, receiver is doer
          {
            posterId: userId,
            doerId: receiverId
          },
          // User is doer, receiver is poster
          {
            doerId: userId,
            posterId: receiverId
          }
        ]
      },
      select: {
        id: true,
        title: true,
        reviews: {
          where: {
            reviewerId: userId,
            receiverId: receiverId
          }
        }
      }
    });

    // Check if there are assignments without reviews from this user
    const assignmentsWithoutReviews = assignments.filter(
      assignment => assignment.reviews.length === 0
    );

    return { 
      canReview: assignmentsWithoutReviews.length > 0,
      assignments: assignmentsWithoutReviews.map(a => ({ id: a.id, title: a.title }))
    };
  } catch (error) {
    console.error("Error checking review eligibility:", error);
    return { canReview: false, assignments: [] };
  }
}

// Edit an existing review (within 48 hours)
export async function editReview(reviewId: string, rating: number, comment: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Find the review
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        receiver: {
          select: { id: true }
        }
      }
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    // Check if user is the author of the review
    if (review.reviewerId !== userId) {
      return { success: false, error: "You can only edit your own reviews" };
    }

    // Check if the review is within the 48-hour edit window
    const createdAt = new Date(review.createdAt);
    const now = new Date();
    const hoursDifference = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursDifference > 48) {
      return { 
        success: false, 
        error: "Reviews can only be edited within 48 hours of posting" 
      };
    }

    // Update the review
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating,
        comment,
        updatedAt: new Date()
      }
    });

    // Update the receiver's average rating
    await updateUserRating(review.receiverId);

    // Revalidate related paths
    revalidatePath(`/poster/profile/${review.receiverId}`);
    revalidatePath(`/doer/profile/${review.receiverId}`);

    return { success: true, data: updatedReview };
  } catch (error) {
    console.error("Error editing review:", error);
    return { success: false, error: "Failed to edit review" };
  }
}

// Delete a review (within 48 hours)
export async function deleteReview(reviewId: string) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Find the review
    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    // Check if user is the author of the review
    if (review.reviewerId !== userId) {
      return { success: false, error: "You can only delete your own reviews" };
    }

    // Check if the review is within the 48-hour edit window
    const createdAt = new Date(review.createdAt);
    const now = new Date();
    const hoursDifference = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursDifference > 48) {
      return { 
        success: false, 
        error: "Reviews can only be deleted within 48 hours of posting" 
      };
    }

    // Delete the review
    await prisma.review.delete({
      where: { id: reviewId }
    });

    // Update the receiver's average rating
    await updateUserRating(review.receiverId);

    // Revalidate related paths
    revalidatePath(`/poster/profile/${review.receiverId}`);
    revalidatePath(`/doer/profile/${review.receiverId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting review:", error);
    return { success: false, error: "Failed to delete review" };
  }
}

// Get a specific review by ID
export async function getReviewById(reviewId: string) {
  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        assignment: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    return { success: true, data: review };
  } catch (error) {
    console.error("Error fetching review:", error);
    return { success: false, error: "Failed to fetch review" };
  }
}

// Helper function to update a user's average rating
async function updateUserRating(userId: string) {
  const reviews = await prisma.review.findMany({
    where: { receiverId: userId },
    select: { rating: true }
  });
  
  if (reviews.length > 0) {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    await prisma.user.update({
      where: { id: userId },
      data: { rating: averageRating }
    });
  }
} 