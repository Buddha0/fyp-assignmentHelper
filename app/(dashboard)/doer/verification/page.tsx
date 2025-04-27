"use client"

import { VerificationCard } from "@/components/verification-card"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useUser } from "@clerk/nextjs"
import { doerNavItems } from "../../navigation-config"




export default function DoerVerificationPage() {
  const { user } = useUser()

  return (
    <DashboardLayout navItems={doerNavItems} userRole="doer" userName={user?.fullName || "Doer"}>
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Account Verification</h1>
        </div>
        
        <p className="text-muted-foreground">
          Before you can bid on tasks, you need to verify your identity by uploading a government-issued 
          identification document. This helps us maintain a secure platform for all users and ensures 
          clients can trust the doers they work with.
        </p>
        
        <VerificationCard />
        
        <div className="border rounded-lg p-6 bg-muted/40">
          <h3 className="text-lg font-medium mb-2">Why verification matters for doers</h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Builds trust with potential clients</li>
            <li>Increases your chances of winning bids</li>
            <li>Protects our community from fraudulent activities</li>
            <li>Ensures only qualified individuals can access tasks</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Your document will be reviewed by our admin team, and your verification status will 
            be updated within 24-48 hours. Once verified, you will be able to bid on and accept tasks.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
} 