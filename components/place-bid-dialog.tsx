"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DollarSign, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface PlaceBidDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  taskTitle: string
  taskBudget: number
  taskDeadline: string
  onSubmit: (data: { taskId: string; bidContent: string; bidAmount: number }) => Promise<void>
}

export function PlaceBidDialog({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  taskBudget,
  taskDeadline,
  onSubmit,
}: PlaceBidDialogProps) {
  const [bidContent, setBidContent] = useState("")
  const [bidAmountInput, setBidAmountInput] = useState(taskBudget.toString())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    // Validate inputs
    if (!bidContent.trim()) {
      toast.error("Please provide a description for your bid.")
      return
    }

    const bidAmount = parseFloat(bidAmountInput)
    if (isNaN(bidAmount) || bidAmount <= 0) {
      toast.error("Please enter a valid bid amount.")
      return
    }

    setIsSubmitting(true)
    
    try {
      await onSubmit({
        taskId,
        bidContent,
        bidAmount,
      })
      
      // Reset form on success
      setBidContent("")
      setBidAmountInput(taskBudget.toString())
      
      // Note: We don't need to close dialog here as the parent component will handle it
    } catch (error) {
      console.error("Error submitting bid:", error)
      toast.error(error instanceof Error ? error.message : "Failed to place bid. Please try again.")
    } finally {
      // Always reset the submitting state
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        // Reset form state when dialog closes
        if (!newOpen && !isSubmitting) {
          setBidContent("")
          setBidAmountInput(taskBudget.toString())
        }
        onOpenChange(newOpen)
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Place a Bid on Task</DialogTitle>
          <DialogDescription>
            Submit your proposal for &quot;{taskTitle}&quot;. The task budget is ${taskBudget.toFixed(2)} and is due by {new Date(taskDeadline).toLocaleDateString()}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bid-amount">Your Bid Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="bid-amount"
                type="number"
                className="pl-8"
                value={bidAmountInput}
                min={1}
                step={0.01}
                onChange={(e) => setBidAmountInput(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Poster budget: ${taskBudget.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bid-content">Proposal Details</Label>
            <Textarea
              id="bid-content"
              placeholder="Describe your experience and why you're the best person for this task..."
              value={bidContent}
              onChange={(e) => setBidContent(e.target.value)}
              rows={6}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Bid"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

