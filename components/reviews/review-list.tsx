"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { Edit, MoreVertical, Star, Trash } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { editReview, deleteReview } from "@/actions/reviews";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  reviewerId: string;
  reviewer: {
    id: string;
    name: string | null;
    image: string | null;
    role: string;
  };
  assignment: {
    id: string;
    title: string;
  };
}

interface ReviewListProps {
  reviews: Review[];
}

export function ReviewList({ reviews }: ReviewListProps) {
  const { user } = useUser();
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  const [editedRating, setEditedRating] = useState(0);
  const [editedComment, setEditedComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No reviews yet</p>
      </div>
    );
  }

  const handleEditClick = (review: Review) => {
    setEditingReview(review);
    setEditedRating(review.rating);
    setEditedComment(review.comment || "");
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (reviewId: string) => {
    setReviewToDelete(reviewId);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingReview) return;
    
    try {
      setIsSubmitting(true);
      const result = await editReview(
        editingReview.id,
        editedRating,
        editedComment
      );

      if (result.success) {
        toast.success("Review updated successfully");
        setIsEditDialogOpen(false);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to update review");
      }
    } catch (error) {
      console.error("Error updating review:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!reviewToDelete) return;
    
    try {
      setIsSubmitting(true);
      const result = await deleteReview(reviewToDelete);

      if (result.success) {
        toast.success("Review deleted successfully");
        setIsDeleteDialogOpen(false);
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to delete review");
      }
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isWithin48Hours = (reviewDate: Date) => {
    return differenceInHours(new Date(), new Date(reviewDate)) <= 48;
  };

  const handleRatingClick = (value: number) => {
    setEditedRating(value);
  };

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const isOwnReview = user?.id === review.reviewerId;
        const canEdit = isOwnReview && isWithin48Hours(review.createdAt);
        
        return (
          <Card key={review.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={review.reviewer?.image || undefined} alt={review.reviewer?.name || "User"} />
                  <AvatarFallback>
                    {review.reviewer?.name?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{review.reviewer?.name || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(review)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteClick(review.id)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  <p className="text-sm mt-2">{review.comment}</p>
                  <div className="mt-2 text-xs text-muted-foreground bg-muted rounded p-1 px-2 inline-block">
                    For: {review.assignment.title}
                  </div>
                  {canEdit && (
                    <div className="mt-2 text-xs text-blue-500">
                      You can edit or delete this review for the next {48 - differenceInHours(new Date(), new Date(review.createdAt))} hours
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Edit Review Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
            <DialogDescription>
              Update your review. You can edit reviews for up to 48 hours after posting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleRatingClick(value)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        value <= editedRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm">
                  {editedRating > 0 ? `${editedRating} ${editedRating === 1 ? "star" : "stars"}` : "Select a rating"}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="comment" className="text-sm font-medium mb-1 block">
                Comment
              </label>
              <Textarea
                id="comment"
                value={editedComment}
                onChange={(e) => setEditedComment(e.target.value)}
                placeholder="Update your review..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 