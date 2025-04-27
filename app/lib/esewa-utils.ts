import crypto from "crypto";

// eSewa test credentials
export const ESEWA_CONFIG = {
  MERCHANT_CODE: "EPAYTEST", // Test merchant code
  SECRET_KEY: "8gBm/:&EnhH.1/q", // Test secret key
  FORM_URL: "https://rc-epay.esewa.com.np/api/epay/main/v2/form", // Test URL
  STATUS_URL: "https://rc.esewa.com.np/api/epay/transaction/status/", // Test status check URL
};

/**
 * Generate HMAC-SHA256 signature for eSewa payment
 * @param total_amount - Total payment amount
 * @param transaction_uuid - Unique transaction ID
 * @param product_code - Merchant code
 * @returns base64 encoded signature
 */
export function generateSignature(
  total_amount: number | string,
  transaction_uuid: string,
  product_code: string = ESEWA_CONFIG.MERCHANT_CODE
): string {
  // Create signature input string in exact order
  const signatureInput = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
  
  // Generate HMAC-SHA256 signature
  const hmac = crypto.createHmac("sha256", ESEWA_CONFIG.SECRET_KEY);
  hmac.update(signatureInput);
  
  // Return base64 encoded signature
  return hmac.digest("base64");
}

/**
 * Verify eSewa response signature
 * @param data - Data object from eSewa
 * @returns boolean indicating if signature is valid
 */
export function verifySignature(data: any): boolean {
  const { signed_field_names, signature } = data;
  
  if (!signed_field_names || !signature) {
    return false;
  }
  
  // Create signature input string in the same order as specified in signed_field_names
  const fieldsToSign = signed_field_names.split(",");
  const signatureInputParts = fieldsToSign.map(field => `${field}=${data[field]}`);
  const signatureInput = signatureInputParts.join(",");
  
  // Generate HMAC-SHA256 signature for verification
  const hmac = crypto.createHmac("sha256", ESEWA_CONFIG.SECRET_KEY);
  hmac.update(signatureInput);
  const calculatedSignature = hmac.digest("base64");
  
  // Compare the received signature with calculated signature
  return signature === calculatedSignature;
}

/**
 * Create form data object for eSewa payment
 * @param amount - Payment amount
 * @param transaction_uuid - Unique transaction ID
 * @param success_url - Success callback URL
 * @param failure_url - Failure callback URL
 * @param payment_id - Internal payment ID reference
 * @returns Object with all required form fields
 */
export function createEsewaFormData(
  amount: number,
  transaction_uuid: string,
  success_url: string,
  failure_url: string,
  payment_id: string
): Record<string, string> {
  // Calculate total amount (add any tax if needed)
  const total_amount = amount;
  
  // Generate signature
  const signature = generateSignature(
    total_amount,
    transaction_uuid,
    ESEWA_CONFIG.MERCHANT_CODE
  );
  
  // Prepare form data
  return {
    amount: amount.toString(),
    tax_amount: "0",
    total_amount: total_amount.toString(),
    transaction_uuid,
    product_code: ESEWA_CONFIG.MERCHANT_CODE,
    product_service_charge: "0",
    product_delivery_charge: "0",
    success_url,
    failure_url,
    signed_field_names: "total_amount,transaction_uuid,product_code",
    signature,
    payment_id, // Include payment ID to reference later
  };
}

/**
 * Check transaction status with eSewa
 * @param product_code - Merchant code
 * @param total_amount - Payment amount
 * @param transaction_uuid - Transaction ID
 * @returns Promise with transaction status response
 */
export async function checkTransactionStatus(
  total_amount: number | string,
  transaction_uuid: string,
  product_code: string = ESEWA_CONFIG.MERCHANT_CODE
): Promise<any> {
  const url = `${ESEWA_CONFIG.STATUS_URL}?product_code=${product_code}&total_amount=${total_amount}&transaction_uuid=${transaction_uuid}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking transaction status:", error);
    throw error;
  }
} 