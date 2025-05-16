"use client";

import { posterNavItems } from "@/app/(dashboard)/navigation-config";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserProfileComponent } from "@/components/user-profile";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ViewUserProfilePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;
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

  const handleBack = () => {
    router.back();
  };

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
        <Button 
          variant="outline" 
          size="sm" 
          className="mb-6" 
          onClick={handleBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

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