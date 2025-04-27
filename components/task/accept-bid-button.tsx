"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { acceptBid } from "@/actions/bids";

interface AcceptBidButtonProps {
  bidId: string;
  taskId: string;
  doerName: string;
  amount: number;
  onSuccess?: () => void;
}

export function AcceptBidButton({
  bidId,
  taskId,
  doerName,
  amount,
  onSuccess,
}: AcceptBidButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAcceptBid = async () => {
    setIsLoading(true);
    
    try {
      const result = await acceptBid(bidId, taskId);
      
      if (result.success) {
        toast.success(`You've successfully accepted ${doerName}'s bid`);
        setIsOpen(false);
        
        // Call the success callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(result.error || "Failed to accept bid");
      }
    } catch (error) {
      console.error("Error accepting bid:", error);
      toast.error("An error occurred while accepting the bid");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button size="sm" onClick={() => setIsOpen(true)}>
        <Check className="h-4 w-4 mr-2" />
        Accept Bid
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Bid</DialogTitle>
            <DialogDescription>
              You are about to accept {doerName}'s bid for ${amount.toFixed(2)}. 
              This will assign the task to them and notify them immediately.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-2">
            <p className="text-sm font-medium">What happens next?</p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>The task will be assigned to {doerName}</li>
              <li>You can communicate directly to discuss details</li>
              <li>Payment will be processed once the work is completed</li>
            </ul>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleAcceptBid} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Accept Bid"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}