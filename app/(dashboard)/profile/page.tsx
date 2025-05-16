"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { posterNavItems, doerNavItems } from "@/app/(dashboard)/navigation-config";
import { getUserRole } from "@/actions/user-role";

export default function ProfileIndexPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [userRole, setUserRole] = useState<"poster" | "doer">("poster"); // Default to poster
  
  useEffect(() => {
    async function loadUserRole() {
      if (user?.id) {
        try {
          const role = await getUserRole(user.id);
          setUserRole(role.toLowerCase() as "poster" | "doer");
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      }
    }

    if (isLoaded && user) {
      loadUserRole();
    }
  }, [isLoaded, user]);
  
  useEffect(() => {
    if (isLoaded) {
      if (user) {
        // Redirect to the user's own profile based on their role
        if (userRole === "doer") {
          router.replace(`/doer/profile/${user.id}`);
        } else {
          router.replace(`/poster/profile/${user.id}`);
        }
      } else {
        // If not logged in, redirect to sign in
        router.replace('/sign-in');
      }
    }
  }, [isLoaded, user, router, userRole]);

  // Determine which nav items to use based on role
  const navItems = userRole === "doer" ? doerNavItems : posterNavItems;

  return (
    <DashboardLayout navItems={navItems} userRole={userRole} userName={user?.fullName || "Guest"}>
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Redirecting to your profile...</p>
      </div>
    </DashboardLayout>
  );
} 