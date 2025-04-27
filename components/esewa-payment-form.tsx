"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface EsewaPaymentFormProps {
  formData: {
    amount: number;
    tax_amount: number;
    total_amount: number;
    transaction_uuid: string;
    product_code: string;
    product_service_charge: number;
    product_delivery_charge: number;
    success_url: string;
    failure_url: string;
    signed_field_names: string;
    signature: string;
  };
  paymentUrl: string;
  autoSubmit?: boolean;
  onCancel?: () => void;
}

export function EsewaPaymentForm({
  formData,
  paymentUrl,
  autoSubmit = false,
  onCancel
}: EsewaPaymentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-submit the form if autoSubmit is true
  useEffect(() => {
    if (autoSubmit && formRef.current) {
      formRef.current.submit();
    }
  }, [autoSubmit]);

  return (
    <div className="w-full rounded-lg border p-4">
      <h2 className="text-xl font-bold mb-4 text-center">eSewa Payment</h2>
      
      <div className="mb-4 p-3 bg-muted rounded-md">
        <div className="flex justify-between mb-2">
          <span className="text-sm text-muted-foreground">Amount:</span>
          <span className="font-medium">Rs. {formData.total_amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Reference:</span>
          <span className="text-xs truncate max-w-[200px]">{formData.transaction_uuid}</span>
        </div>
      </div>
      
      <form ref={formRef} action={paymentUrl} method="POST" className="space-y-4">
        {/* Hidden input fields for all form data */}
        <input type="hidden" name="amount" value={formData.amount} />
        <input type="hidden" name="tax_amount" value={formData.tax_amount} />
        <input type="hidden" name="total_amount" value={formData.total_amount} />
        <input type="hidden" name="transaction_uuid" value={formData.transaction_uuid} />
        <input type="hidden" name="product_code" value={formData.product_code} />
        <input type="hidden" name="product_service_charge" value={formData.product_service_charge} />
        <input type="hidden" name="product_delivery_charge" value={formData.product_delivery_charge} />
        <input type="hidden" name="success_url" value={formData.success_url} />
        <input type="hidden" name="failure_url" value={formData.failure_url} />
        <input type="hidden" name="signed_field_names" value={formData.signed_field_names} />
        <input type="hidden" name="signature" value={formData.signature} />
        
        <div className="flex flex-col sm:flex-row gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              size="sm"
              className="sm:flex-none"
            >
              Cancel
            </Button>
          )}
          
          <Button
            type="submit"
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white sm:flex-1"
          >
            {autoSubmit ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to eSewa...
              </>
            ) : (
              "Pay with eSewa"
            )}
          </Button>
        </div>
      </form>
      
      <p className="mt-4 text-xs text-center text-muted-foreground">
        You will be redirected to eSewa to complete the payment securely.
      </p>
    </div>
  );
} 