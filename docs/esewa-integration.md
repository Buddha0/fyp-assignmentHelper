# eSewa Payment Integration

This document explains how eSewa payment processing is implemented in the Assignment Helper Platform.

## Overview

The integration follows an escrow-style payment flow:

1. Poster accepts a bid and pays via eSewa
2. The payment is held by the platform (not sent directly to the Doer)
3. Once the assignment is completed and approved, the funds are released to the Doer

## Technical Implementation

### Configuration

Test environment credentials (sandbox mode):
- Merchant Code: `EPAYTEST`
- Secret Key: `8gBm/:&EnhH.1/q`
- API Endpoint: `https://rc-epay.esewa.com.np/api/epay/main/v2/form`
- Status Check URL: `https://rc.esewa.com.np/api/epay/transaction/status/`

For production, these values should be changed to production credentials from eSewa.

### Payment Flow

1. **Initiation:**
   - User initiates payment by clicking "Pay with eSewa" button
   - Backend generates `transaction_uuid` using UUID v4
   - Backend creates signature using HMAC-SHA256
   - Payment record is created with status `PENDING`
   - User is redirected to eSewa login page via form POST

2. **Processing:**
   - User logs into eSewa and confirms payment
   - eSewa processes the payment and redirects back to our success URL
   - Success URL includes a base64 encoded parameter with transaction details

3. **Verification:**
   - Backend decodes and verifies the response signature
   - If valid, payment status remains `PENDING` (held in escrow)
   - Assignment status is updated to `IN_PROGRESS`

4. **Release:**
   - When assignment is completed, Poster or Admin approves
   - Backend updates payment status to `RELEASED`
   - Doer's account balance is increased by payment amount
   - Assignment status is updated to `COMPLETED`

### API Endpoints

- **POST `/api/payments/initiate`**
  - Initiates payment process
  - Requires: `assignmentId`, `amount`
  - Returns: Form data for eSewa submission

- **GET `/api/payments/success`**
  - Handles eSewa callback after successful payment
  - Verifies signature and updates payment status

- **POST `/api/payments/release`**
  - Releases held payment to Doer
  - Requires: `paymentId`
  - Can only be called by Poster or Admin

### Components

- **`PaymentButton`**: React component that handles payment initiation
  - Calls the initiate API
  - Dynamically creates and submits form to eSewa

### Testing

To test payments in sandbox mode:
- Use eSewa test credentials:
  - eSewa ID: `9806800001` (can also use 9806800002/3/4/5)
  - Password: `Nepal@123`
  - MPIN: `1122` (for mobile apps)
  - OTP: `123456`

## Database Changes

The `Payment` model has been updated with eSewa-specific fields:
- `esewaTransactionUuid`: Unique transaction ID for eSewa
- `esewaRefId`: Reference ID returned by eSewa after successful payment
- `esewaVerificationJson`: Full JSON response from eSewa for record-keeping

Stripe-related fields have been removed from the schema.

## Security Considerations

- All payment requests include a signature generated with HMAC-SHA256
- Responses are verified by regenerating and comparing signatures
- Transaction UUIDs are randomly generated to prevent predictability
- Payment data is stored for auditing and dispute resolution

## Future Improvements

- Implement automated refund flow for canceled assignments
- Add webhook support for real-time payment notifications
- Create an admin dashboard for payment monitoring
- Implement payment status polling for better reliability 