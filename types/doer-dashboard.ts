import { Role, AssignmentStatus } from "@prisma/client";

// Task status type used in the UI - matches AssignmentStatus from Prisma but in lowercase format
export type TaskStatus = "open" | "assigned" | "in-progress" | "pending-review" | "completed" | "cancelled" | "in-dispute";

// Helper function to convert Prisma AssignmentStatus to UI TaskStatus
export function mapAssignmentStatusToTaskStatus(status: string | AssignmentStatus): TaskStatus {
  switch (status) {
    case 'OPEN':
    case AssignmentStatus.OPEN:
      return 'open'
    case 'ASSIGNED':
    case AssignmentStatus.ASSIGNED:
      return 'assigned'
    case 'IN_PROGRESS':
    case AssignmentStatus.IN_PROGRESS:
      return 'in-progress'
    case 'UNDER_REVIEW':
    case AssignmentStatus.UNDER_REVIEW:
      return 'pending-review'
    case 'COMPLETED':
    case AssignmentStatus.COMPLETED:
      return 'completed'
    case 'CANCELLED':
    case AssignmentStatus.CANCELLED:
      return 'cancelled'
    case 'IN_DISPUTE':
      return 'in-dispute'
    default:
      return 'open'
  }
}

// Interface for active tasks
export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  deadline: string | Date;
  status: TaskStatus;
  progress?: number;
  posterId?: string;
  doerId?: string | null;
  posterName?: string;
  posterImage?: string | null;
  messagesCount?: number;
  bidsCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
  attachments?: any;
  submissionsCount?: number;
}

// Interface for bids
export interface Bid {
  id: string;
  content: string;
  bidAmount: number;
  status: string; // pending, accepted, rejected
  createdAt: Date;
  updatedAt?: Date;
  userId: string;
  assignmentId: string;
  assignment: {
    id: string;
    title: string;
    description: string;
    category: string;
    budget: number;
    deadline: Date | string;
    status: AssignmentStatus | string;
    posterId: string;
    doerId?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  task?: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    budget?: number;
    deadline?: Date | string;
    status?: string;
    poster?: {
      id: string;
      name: string | null;
      image: string | null;
    };
  };
  bidDescription?: string;
}

// Interface for messages in activity feed
export interface Message {
  id: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
  fileUrls?: any;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
  assignment: {
    id: string;
    title: string;
  } | null;
  senderId: string;
  receiverId: string;
  assignmentId?: string | null;
  isPoster?: boolean;
}

// Interface for task updates in activity feed
export interface TaskUpdate {
  id: string;
  title: string;
  description?: string;
  category?: string;
  budget?: number;
  deadline?: Date | string;
  status: string;
  updatedAt: Date;
  createdAt?: Date;
  progress?: number;
}

// Interface for activity summary
export interface ActivitySummary {
  recentMessages: Message[];
  recentTaskUpdates: {
    id: string;
    title: string;
    description: string;
    category: string;
    budget: number;
    deadline: Date | string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    posterId?: string;
    doerId?: string | null;
  }[];
  recentBid: Bid | null;
}

// Interface for user stats
export interface UserStats {
  activeTasks: number;
  completedTasks: number;
  successRate: number;
  unreadMessages: number;
}

// Interface for submissions
export interface Submission {
  id: string;
  content: string;
  attachments?: any;
  status: string; // pending, approved, rejected
  feedback?: string;
  createdAt: Date;
  updatedAt?: Date;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
    rating?: number | null;
  };
}

// Interface for user data
export interface UserData {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: Role;
  bio?: string | null;
  skills?: string | null;
  rating?: number | null;
  verificationStatus?: string;
}