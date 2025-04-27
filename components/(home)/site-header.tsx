"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useIsClient } from "@/app/hooks/useIsClient";
import { useRouter } from "next/navigation";

export function SiteHeader() {
  const { isSignedIn, user, isLoaded } = useUser();
  const isClient = useIsClient();
  const router = useRouter();
  const [dashboardRoute, setDashboardRoute] = useState<string>("/");

  // Update dashboard route when user data changes
  useEffect(() => {
    if (isLoaded && user) {
      const userRole = user.publicMetadata?.role as string;
      const route =
        userRole === "DOER" ? "/doer" :
        userRole === "POSTER" ? "/poster" :
        userRole === "ADMIN" ? "/dashboard/admin" :
        "/"; // Redirect to home if role is unknown
      
      setDashboardRoute(route);
    }
  }, [isLoaded, user]);

  if (!isClient) {
    return null;
  }

  // Handle dashboard click with navigation logic
  const handleDashboardClick = (e: React.MouseEvent) => {
    if (!isSignedIn) {
      e.preventDefault();
      router.push("/sign-in");
      return;
    }
    
    // Let the link navigate naturally if signed in with valid role
  };

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="font-semibold text-xl">
          Assignment Helper
        </Link>

        <div className="flex items-center space-x-4">
          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetTitle>Menu</SheetTitle>
              <div className="flex flex-col space-y-4 mt-8">
                <Link href="/" className="text-sm hover:text-primary">
                  Home Page
                </Link>
                <Link 
                  href={dashboardRoute} 
                  className="text-sm hover:text-primary"
                  onClick={handleDashboardClick}
                >
                  Dashboard
                </Link>
                <Link href="/services" className="text-sm hover:text-primary">
                  Services
                </Link>
                <Link href="/help" className="text-sm hover:text-primary">
                  Get Help
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              Home Page
            </Link>
            <Link 
              href={dashboardRoute} 
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={handleDashboardClick}
            >
              Dashboard
            </Link>
            <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground">
              Services
            </Link>
            <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground">
              Get Help
            </Link>
          </nav>

          {/* Conditional Rendering */}
          {isSignedIn ? (
            <UserButton  />
          ) : (
            <Button size="sm" asChild>
              <Link href="/sign-in">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
