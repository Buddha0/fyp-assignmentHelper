"use client";

import { getUserRole } from "@/actions/user-role";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfileRedirectPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  // const [isRedirecting, setIsRedirecting] = useState(true);
  
  useEffect(() => {
    async function redirectToCorrectProfile() {
      if (isLoaded) {
        if (user) {
          try {
            // Get the user's role to determine the correct path
            const userRole = await getUserRole(user.id);
            const profilePath = userRole.toLowerCase() === "doer" 
              ? `/doer/profile/${user.id}` 
              : `/poster/profile/${user.id}`;
            
            // Redirect to the role-specific profile page
            router.replace(profilePath);
          } catch (error) {
            console.error("Error fetching user role:", error);
            // Fallback to poster profile if role fetch fails
            router.replace(`/poster/profile/${user.id}`);
          }
        } else {
          // If not logged in, redirect to sign in
          router.replace('/sign-in');
          // setIsRedirecting(false);
        }
      }
    }
    
    redirectToCorrectProfile();
  }, [isLoaded, user, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p>Redirecting to profile...</p>
    </div>
  );
} 