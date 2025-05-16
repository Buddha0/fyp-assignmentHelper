"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UserProfileComponent } from "@/components/user-profile";
import { DashboardLayout } from "@/components/dashboard-layout";
import { posterNavItems } from "@/app/(dashboard)/navigation-config";

export default function PosterProfilePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      if (!user) {
        router.replace('/sign-in');
      } else {
        setLoading(false);
      }
    }
  }, [isLoaded, user, router]);

  if (loading || !isLoaded) {
    return (
      <DashboardLayout navItems={posterNavItems} userRole="poster" userName={user?.fullName || "Guest"}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={posterNavItems} userRole="poster" userName={user?.fullName || "Guest"}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>

        {user?.id ? (
          <UserProfileComponent userId={user.id} />
        ) : (
          <Card className="p-6">
            <p className="text-center">Error loading profile</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
} 