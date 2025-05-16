"use client";

import { doerNavItems } from "@/app/(dashboard)/navigation-config";
import { DashboardLayout } from "@/components/dashboard-layout";
import { UserProfileComponent } from "@/components/user-profile";
import { useUser } from "@clerk/nextjs";

export default function DoerProfilePage() {
  const { user } = useUser();

  return (
    <DashboardLayout navItems={doerNavItems} userRole="doer" userName={user?.fullName || ""}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        </div>

        <UserProfileComponent />
      </div>
    </DashboardLayout>
  );
} 