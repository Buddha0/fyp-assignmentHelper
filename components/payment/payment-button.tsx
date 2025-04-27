"use client";

import { Button } from "@/components/ui/button";
import axios from "axios";
import { useState } from "react";

interface PaymentButtonProps {
  assignmentId: string;
  amount: number;
  onPaymentInitiated?: () => void;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  buttonText?: string;
  disabled?: boolean;
}

export default function PaymentButton({
  assignmentId,
  amount,
  onPaymentInitiated,
  onError,
  buttonText = "Pay with eSewa",
  disabled = false,
}: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  
  async function initiatePayment() {
    setLoading(true);
    try {
      // Call the API to initiate payment
      const response = await axios.post("/api/payments/initiate", {
        assignmentId,
        amount,
      });

      if (response.data.success) {
        // Call the onPaymentInitiated callback if provided
        if (onPaymentInitiated) {
          onPaymentInitiated();
        }

        // Dynamically create and submit form to eSewa
        const { formData, esewaUrl } = response.data;
        
        // Create a form element
        const form = document.createElement("form");
        form.method = "POST";
        form.action = esewaUrl;
        form.style.display = "none";

        // Add form fields
        Object.entries(formData).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        });

        // Append form to body and submit
        document.body.appendChild(form);
        form.submit();

        // Clean up
        setTimeout(() => {
          document.body.removeChild(form);
        }, 100);
      }
    } catch (error) {
      console.error("Payment initiation failed:", error);
      
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        onClick={initiatePayment}
        disabled={disabled || loading}
        className="w-full"
      >
        {loading ? "Processing..." : buttonText}
      </Button>
    </>
  );
} 