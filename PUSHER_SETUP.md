# Pusher Real-Time Chat Integration

This project uses Pusher for real-time chat functionality between task posters and doers.

## Setup Instructions

1. **Sign up for a Pusher account** at [pusher.com](https://pusher.com) if you don't already have one.

2. **Create a new Channels app** in the Pusher dashboard.

3. **Configure environment variables**:

   Add the following environment variables to your `.env` file:

   ```
   # Pusher configuration
   PUSHER_APP_ID="your_app_id"
   PUSHER_KEY="your_key"
   PUSHER_SECRET="your_secret"
   PUSHER_CLUSTER="your_cluster"
   NEXT_PUBLIC_PUSHER_KEY="your_key"
   NEXT_PUBLIC_PUSHER_CLUSTER="your_cluster"
   PUSHER_WEBHOOK_SECRET="your_webhook_secret" # Optional, for webhook validation
   ```

4. **Set up Pusher webhooks** (optional):
   - In your Pusher dashboard, go to the "Webhooks" tab
   - Add a new webhook with the URL: `https://your-domain.com/api/webhook/pusher`
   - Select the events you want to trigger the webhook (e.g., "Channel existence" events)

## Usage

The chat functionality is implemented in the following components and files:

- `lib/pusher.ts` - Pusher configuration
- `components/chat/ChatInterface.tsx` - Reusable chat interface component
- `actions/send-message.ts` - Server action for sending messages
- `actions/get-messages.ts` - Server action for retrieving messages

The chat interface is integrated into:
- Doer task details page 
- Poster task details page (when a doer is assigned)

## Channel Naming Convention

Chat channels follow this naming convention: `assignment-{assignmentId}`

This allows each task to have its own private communication channel between the poster and doer. 