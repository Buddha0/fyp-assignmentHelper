"use client"

import { VerificationCard } from "@/components/verification-card"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useUser } from "@clerk/nextjs"
import { posterNavItems } from "../../navigation-config"



export default function PosterVerificationPage() {
  const { user } = useUser()

  return (
    <DashboardLayout navItems={posterNavItems} userRole="poster" userName={user?.fullName || "Poster"}>
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Account Verification</h1>
        </div>
        
        <p className="text-muted-foreground">
          Before you can post tasks, you need to verify your identity by uploading a government-issued 
          identification document. This helps us maintain a secure platform for all users.
        </p>
        
        <VerificationCard />
        
        <div className="border rounded-lg p-6 bg-muted/40">
          <h3 className="text-lg font-medium mb-2">Why do we need verification?</h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>To ensure the security and integrity of our platform</li>
            <li>To prevent fraudulent activity</li>
            <li>To build a trusted community of posters and doers</li>
            <li>To comply with regulatory requirements</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Your document will be reviewed by our admin team, and your verification status will 
            be updated within 24-48 hours. Once verified, you will have full access to all platform features.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
} 