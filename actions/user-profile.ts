"use server";

import prisma from "@/lib/db";

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  skills: string | null;
  portfolio: any[] | null;
  experience: string | null;
  rating: number | null;
}

export interface ProfileUpdateInput {
  bio: string | null;
  skills: string | null;
  portfolio: any[] | null;
  experience: string | null;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewer: {
    id: string;
    name: string | null;
    image: string | null;
  };
  createdAt: Date;
}

/**
 * Get user profile data
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        skills: true,
        rating: true,
      },
    });

    if (!user) {
      return null;
    }

    // Parse the portfolio from skills field (assuming it's stored as JSON string in skills)
    let portfolio = null;
    let experience = null;

    try {
      // If skills contains JSON with portfolio and experience
      if (user.skills) {
        const parsed = JSON.parse(user.skills);
        portfolio = parsed.portfolio || null;
        experience = parsed.experience || null;
      }
    } catch (error) {
      // If not JSON, just use skills as skills
      portfolio = null;
      experience = null;
    }

    return {
      ...user,
      portfolio,
      experience,
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/**
 * Update user profile data
 */
export async function updateUserProfile(
  userId: string,
  data: ProfileUpdateInput
): Promise<UserProfile | null> {
  try {
    // Prepare skills field to store both skills, portfolio and experience
    const skillsData = JSON.stringify({
      skills: data.skills || "",
      portfolio: data.portfolio || [],
      experience: data.experience || "",
    });

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        bio: data.bio,
        skills: skillsData,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        skills: true,
        rating: true,
      },
    });

    // Parse back the data for consistent return format
    let portfolio = null;
    let experience = null;

    try {
      if (updatedUser.skills) {
        const parsed = JSON.parse(updatedUser.skills);
        portfolio = parsed.portfolio || null;
        experience = parsed.experience || null;
      }
    } catch (error) {
      portfolio = null;
      experience = null;
    }

    return {
      ...updatedUser,
      portfolio,
      experience,
    };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return null;
  }
}

/**
 * Get user reviews
 */
export async function getUserReviews(userId: string): Promise<Review[]> {
  try {
    // Fetch real reviews from the database
    const realReviews = await prisma.review.findMany({
      where: {
        receiverId: userId,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        reviewer: {
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
    });

    return realReviews;
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    // Return empty array in case of error instead of dummy reviews
    return [];
  }
} 