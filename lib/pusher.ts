import PusherServer from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Client-side Pusher instance
export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  }
);

// Channel naming conventions
export const CHANNEL_TYPES = {
  ASSIGNMENT: 'assignment', // For assignment-specific communications
  USER: 'user',             // For user-specific notifications
  BID: 'bid',               // For bid-related updates
  TASK: 'task'              // For task status updates
};

// Event types
export const EVENT_TYPES = {
  NEW_MESSAGE: 'new-message',
  MESSAGES_READ: 'messages-read',
  TYPING_START: 'typing-start',
  TYPING_STOP: 'typing-stop',
  NEW_BID: 'new-bid',
  BID_ACCEPTED: 'bid-accepted',
  BID_REJECTED: 'bid-rejected',
  TASK_UPDATED: 'task-updated',
  NEW_NOTIFICATION: 'new-notification',
  URGENT_NOTIFICATION: 'urgent-notification',
  SUBMISSION_STATUS_UPDATED: 'submission-status-updated',
  NEW_SUPPORT_MESSAGE: 'new-support-message',
};

// Helper functions for channel names
export function getUserChannel(userId: string) {
  return `${CHANNEL_TYPES.USER}-${userId}`;
}

export function getAssignmentChannel(assignmentId: string) {
  return `${CHANNEL_TYPES.ASSIGNMENT}-${assignmentId}`;
}

export function getBidChannel(bidId: string) {
  return `${CHANNEL_TYPES.BID}-${bidId}`;
}

export function getTaskChannel(taskId: string) {
  return `${CHANNEL_TYPES.TASK}-${taskId}`;
} 