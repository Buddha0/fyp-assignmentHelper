import { AlertTriangle, Briefcase, ClipboardList, FilePlus, Gavel, Home, LayoutDashboard, ListChecks, ListFilter, MessageSquare, ShieldCheck, Users, DollarSign, UserCircle } from "lucide-react";

// Navigation items for Poster role
export const posterNavItems = [
  {
    href: "/poster",
    label: "Dashboard",
    icon: Home,
  },
  {
    href: "/poster/tasks",
    label: "My Tasks",
    icon: ListChecks,
  },
  {
    href: "/poster/create-task",
    label: "Create Task",
    icon: FilePlus,
  },
  {
    href: "/poster/profile",
    label: "My Profile",
    icon: UserCircle,
  },
  {
    href: "/poster/disputes",
    label: "Disputes",
    icon: Gavel,
  },
  {
    href: "/poster/verification",
    label: "Verification",
    icon: ShieldCheck,
  },
 
];

// Navigation items for Doer role
export const doerNavItems = [
  {
    href: "/doer",
    label: "Dashboard",
    icon: Home,
  },
  {
    href: "/doer/available-tasks",
    label: "Available Tasks",
    icon: ListFilter,
  },
  {
    href: "/doer/active-tasks",
    label: "My Active Tasks",
    icon: ClipboardList,
  },
  {
    href: "/doer/bids",
    label: "My Bids",
    icon: Briefcase,
  },
  {
    href: "/doer/earnings",
    label: "My Earnings",
    icon: DollarSign,
  },
  {
    href: "/doer/profile",
    label: "My Profile",
    icon: UserCircle,
  },
  {
    href: "/doer/disputes",
    label: "Disputes",
    icon: AlertTriangle,
  },
  {
    href: "/doer/verification",
    label: "Verification",
    icon: ShieldCheck,
  },

]; 

export const adminNavItems = [
  {
    href: "/dashboard/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/admin/verification",
    label: "Verification",
    icon: ShieldCheck,
  },
  {
    href: "/dashboard/admin/users",
    label: "Users",
    icon: Users,
  },
  {
    href: "/dashboard/admin/support",
    label: "Support",
    icon: MessageSquare,
  },
  {
    href: "/dashboard/admin/disputes",
    label: "Disputes",
    icon: Gavel,
  },
  
];
