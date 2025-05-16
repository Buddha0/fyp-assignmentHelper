"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { Star } from "lucide-react";

import { ReviewList } from "./review-list";
import { ReviewForm } from "./review-form";
import { canReviewUser, getUserReviews } from "@/actions/reviews";

interface UserReviewsSectionProps {
  userId: string;
}

interface Assignment {
  id: string;
  title: string;
}

export function UserReviewsSection({ userId }: UserReviewsSectionProps) {
  const { user, isLoaded } = useUser();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [reviewableAssignments, setReviewableAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        
        // Fetch reviews for this user
        const reviewsResult = await getUserReviews(userId);
        if (reviewsResult.success) {
          setReviews(reviewsResult.data);
        }
        
        // Check if current user can review this user
        if (isLoaded && user && user.id !== userId) {
          const reviewPermission = await canReviewUser(userId);
          setCanReview(reviewPermission.canReview);
          setReviewableAssignments(reviewPermission.assignments);
        }
      } catch (error) {
        console.error("Error loading reviews:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadReviews();
    }
  }, [userId, isLoaded, user]);

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  if (loading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-pulse h-32 w-full bg-muted rounded-md"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Reviews ({reviews.length})</CardTitle>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < Math.round(averageRating) 
                    ? "fill-yellow-400 text-yellow-400" 
                    : "text-gray-300"
                }`}
              />
            ))}
            <span className="ml-2 text-sm">
              {reviews.length > 0 ? `${averageRating.toFixed(1)} (${reviews.length})` : "No ratings yet"}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {canReview && (
          <ReviewForm 
            receiverId={userId} 
            assignments={reviewableAssignments}
          />
        )}

        <div className="mt-6">
          <ReviewList reviews={reviews} />
        </div>
      </CardContent>
    </Card>
  );
} 