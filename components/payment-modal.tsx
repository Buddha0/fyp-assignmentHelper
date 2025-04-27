"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EsewaPaymentForm } from "@/components/esewa-payment-form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  bidId: string;
  bidAmount: number;
}

export function PaymentModal({
  open,
  onOpenChange,
  taskId,
  bidId,
  bidAmount,
}: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const initiatePayment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId,
          bidId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPaymentData(result.data);
      } else {
        setError(result.error || "Failed to initiate payment");
        toast.error(result.error || "Failed to initiate payment");
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
      setError("An unexpected error occurred");
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (paymentData) {
      setPaymentData(null);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[450px] ${paymentData ? 'p-4 sm:p-6' : ''}`}>
        <DialogHeader className={paymentData ? 'mb-2' : ''}>
          <DialogTitle>
            {paymentData ? "Complete Payment" : "Accept Bid & Pay"}
          </DialogTitle>
        </DialogHeader>

        {!paymentData ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-md">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Bid Amount:</span>
                <span className="font-medium">Rs. {bidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Payment:</span>
                <span className="font-medium text-green-600">eSewa</span>
              </div>
            </div>

            <p className="text-sm">
              By accepting this bid, you agree to pay the bid amount. The payment will be held in
              escrow until the task is completed satisfactorily.
            </p>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={initiatePayment}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Continue to Payment"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <EsewaPaymentForm
              formData={paymentData.formData}
              paymentUrl={paymentData.paymentUrl}
              onCancel={handleCancel}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 