"use client"

import { getAdminDashboardStats } from "@/actions/admin-stats"
import { DashboardLayout } from "@/components/dashboard-layout"
import { StatsCard } from "@/components/stats-card"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useUser } from "@clerk/nextjs"
import { ClipboardCheck, Gavel, ShieldCheck, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { adminNavItems } from "../../navigation-config"



export default function AdminDashboard() {
  const { user } = useUser()
  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    activeAssignments: 0,
    openDisputes: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminDashboardStats()
        setStats(data)
      } catch (error) {
        console.error("Failed to fetch admin stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <DashboardLayout navItems={adminNavItems} userRole="admin" userName={user?.fullName || "Admin"}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-10 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <StatsCard
                title="Total Users"
                value={stats.totalUsers.toString()}
                description="Total registered users"
                icon={Users}
              />
              
              <StatsCard
                title="Verified Users"
                value={stats.verifiedUsers.toString()}
                description="Successfully verified users"
                icon={ShieldCheck}
              />
              <StatsCard 
                title="Active Assignments"
                value={stats.activeAssignments.toString()}
                description="Currently active assignments"
                icon={ClipboardCheck}
              />
              
              <StatsCard 
                title="Open Disputes"
                value={stats.openDisputes.toString()}
                description="Disputes requiring attention"
                icon={Gavel}
              />
            </>
          )}
        </div>

        
      </div>
    </DashboardLayout>
  )
} 