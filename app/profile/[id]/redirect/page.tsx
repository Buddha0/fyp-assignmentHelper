"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ProfileIdRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  
  useEffect(() => {
    if (id) {
      // Redirect to the poster profile page by default
      // We choose poster as default since it's more likely a visitor is browsing tasks
      router.replace(`/poster/profile/${id}`);
    } else {
      // If no ID provided, redirect to dashboard
      router.replace('/dashboard');
    }
  }, [id, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p>Redirecting to profile...</p>
    </div>
  );
} 