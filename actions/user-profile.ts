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

// Dummy reviews data for UI demonstration
const dummyReviews: Review[] = [
  {
    id: "review1",
    rating: 5,
    comment: "This person is an exceptional worker. They completed the task ahead of schedule and the quality was outstanding. Would definitely hire again!",
    reviewer: {
      id: "user123",
      name: "Sarah Johnson",
      image: "https://i.pravatar.cc/150?img=1"
    },
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
  },
  {
    id: "review2",
    rating: 4.5,
    comment: "Great communication and excellent work. They listened to my requirements carefully and delivered exactly what I needed.",
    reviewer: {
      id: "user456",
      name: "Michael Chen",
      image: "https://i.pravatar.cc/150?img=3"
    },
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
  },
  {
    id: "review3",
    rating: 3.5,
    comment: "Good work overall. There were a few minor issues but they were quickly resolved when I pointed them out.",
    reviewer: {
      id: "user789",
      name: "Alex Rodriguez",
      image: "https://i.pravatar.cc/150?img=4"
    },
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // 14 days ago
  },
  {
    id: "review4",
    rating: 5,
    comment: "Absolutely fantastic! They went above and beyond what was required and added several valuable suggestions that improved the final result.",
    reviewer: {
      id: "user101",
      name: "Emily Watson",
      image: "https://i.pravatar.cc/150?img=5"
    },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  },
  {
    id: "review5",
    rating: 4,
    comment: "Reliable and professional. Completed the task on time and as specified.",
    reviewer: {
      id: "user202",
      name: "David Kim",
      image: "https://i.pravatar.cc/150?img=8"
    },
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // 45 days ago
  }
];

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
    // First, try to fetch real reviews from the database
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

    // If there are real reviews, return them
    if (realReviews.length > 0) {
      return realReviews;
    }

    // Otherwise, return dummy reviews for demonstration
    return dummyReviews;
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    // Return dummy reviews in case of error
    return dummyReviews;
  }
} 