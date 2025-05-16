"use client";

import { UserProfileComponent } from "@/components/user-profile";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { posterNavItems, doerNavItems } from "@/app/(dashboard)/navigation-config";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { getUserRole } from "@/actions/user-role";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Loader2 } from "lucide-react";

export default function UserProfilePage() {
  const params = useParams();
  const userId = params?.id as string;
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"poster" | "doer">("poster"); // Default to poster

  // Determine the current user's role if they're logged in
  useEffect(() => {
    async function loadUserRole() {
      if (isLoaded) {
        try {
          setLoading(true);
          if (user?.id) {
            const role = await getUserRole(user.id);
            setUserRole(role.toLowerCase() as "poster" | "doer");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        } finally {
          setLoading(false);
        }
      }
    }

    loadUserRole();
  }, [isLoaded, user]);

  // Determine which nav items to use based on role
  const navItems = userRole === "doer" ? doerNavItems : posterNavItems;

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} userRole={userRole} userName={user?.fullName || "Guest"}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p>Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} userRole={userRole} userName={user?.fullName || "Guest"}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>

        {userId ? (
          <UserProfileComponent userId={userId} />
        ) : (
          <Card className="p-6">
            <p className="text-center">No user ID provided</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
} 