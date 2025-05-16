"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createReview } from "@/actions/reviews";
import { Star } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Assignment {
  id: string;
  title: string;
}

interface ReviewFormProps {
  receiverId: string;
  assignments: Assignment[];
}

export function ReviewForm({ receiverId, assignments }: ReviewFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please add a comment");
      return;
    }

    if (!assignmentId) {
      toast.error("Please select an assignment");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await createReview(
        receiverId,
        assignmentId,
        rating,
        comment
      );

      if (result.success) {
        toast.success("Review submitted successfully");
        setIsOpen(false);
        setRating(0);
        setComment("");
        setAssignmentId("");
        
        // Reload the page to show the new review
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingClick = (value: number) => {
    setRating(value);
  };

  const handleRatingHover = (value: number) => {
    setHoverRating(value);
  };

  const handleRatingLeave = () => {
    setHoverRating(0);
  };

  if (assignments.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="mt-4">Leave a Review</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
          <DialogDescription>
            Share your experience working with this user.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Select Assignment</label>
            <Select value={assignmentId} onValueChange={setAssignmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an assignment" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((assignment) => (
                  <SelectItem key={assignment.id} value={assignment.id}>
                    {assignment.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRatingClick(value)}
                  onMouseEnter={() => handleRatingHover(value)}
                  onMouseLeave={handleRatingLeave}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-6 w-6 ${
                      (hoverRating > 0 ? value <= hoverRating : value <= rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm">
                {rating > 0 ? `${rating} ${rating === 1 ? "star" : "stars"}` : "Select a rating"}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="comment" className="text-sm font-medium mb-1 block">
              Comment
            </label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details of your experience working with this user..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 