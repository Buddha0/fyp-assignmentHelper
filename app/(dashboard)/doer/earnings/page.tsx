"use client"

import { getDoerEarningsDetails, getDoerEarningsSummary } from "@/actions/doer-earnings"
import { doerNavItems } from "@/app/(dashboard)/navigation-config"
import { DashboardLayout } from "@/components/dashboard-layout"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@clerk/nextjs"
import { PaymentStatus } from "@prisma/client"
import { CircleDollarSign, Clock, AlertTriangle, CheckCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

// Define types for earnings data
interface EarningsSummary {
  totalEarnings: number
  pendingEarnings: number
  disputedEarnings: number
  completedEarnings: number
}

interface EarningDetail {
  id: string
  taskTitle: string
  amount: number
  status: PaymentStatus
  taskId: string
  taskStatus: string
  createdAt: Date
  completedAt: Date | null
}

// Helper function to format date
function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

// Helper function to render status badge
function getStatusBadge(status: PaymentStatus) {
  switch (status) {
    case "COMPLETED":
      return <Badge className="bg-green-500">Completed</Badge>
    case "PENDING":
      return <Badge className="bg-yellow-500">Pending</Badge>
    case "DISPUTED":
      return <Badge className="bg-red-500">Disputed</Badge>
    case "RELEASED":
      return <Badge className="bg-blue-500">Released</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

export default function DoerEarningsPage() {
  const { user } = useUser()
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    pendingEarnings: 0,
    disputedEarnings: 0,
    completedEarnings: 0
  })
  const [earnings, setEarnings] = useState<EarningDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEarningsData() {
      if (user?.id) {
        try {
          setLoading(true)
          const [summaryData, earningsDetails] = await Promise.all([
            getDoerEarningsSummary(user.id),
            getDoerEarningsDetails(user.id)
          ])
          
          setSummary(summaryData)
          setEarnings(earningsDetails)
        } catch (error) {
          console.error("Error fetching earnings data:", error)
          toast.error("Failed to load earnings data")
        } finally {
          setLoading(false)
        }
      }
    }
    
    fetchEarningsData()
  }, [user?.id])

  // Filter earnings by status for tabs
  const completedEarnings = earnings.filter(earning => 
    earning.status === "COMPLETED" || earning.status === "RELEASED"
  )
  const pendingEarnings = earnings.filter(earning => earning.status === "PENDING")
  const disputedEarnings = earnings.filter(earning => earning.status === "DISPUTED")

  return (
    <DashboardLayout navItems={doerNavItems} userRole="doer" userName={user?.fullName || ""}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">My Earnings</h1>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array(4).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-10 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-60 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <CircleDollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="text-2xl font-bold">Rs {summary.totalEarnings.toFixed(2)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Lifetime earnings from completed tasks</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-yellow-500" />
                    <div className="text-2xl font-bold">Rs {summary.pendingEarnings.toFixed(2)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Earnings from tasks awaiting completion</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Disputed Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
                    <div className="text-2xl font-bold">Rs {summary.disputedEarnings.toFixed(2)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Earnings from tasks under dispute</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Completed Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    <div className="text-2xl font-bold">Rs {summary.completedEarnings.toFixed(2)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Earnings from successfully completed tasks</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Earnings History</CardTitle>
                <CardDescription>View all your earnings by status</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList>
                    <TabsTrigger value="all">All Earnings</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="disputed">Disputed</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all" className="mt-4">
                    {renderEarningsTable(earnings)}
                  </TabsContent>
                  
                  <TabsContent value="completed" className="mt-4">
                    {renderEarningsTable(completedEarnings)}
                  </TabsContent>
                  
                  <TabsContent value="pending" className="mt-4">
                    {renderEarningsTable(pendingEarnings)}
                  </TabsContent>
                  
                  <TabsContent value="disputed" className="mt-4">
                    {renderEarningsTable(disputedEarnings)}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function renderEarningsTable(earnings: EarningDetail[]) {
  if (earnings.length === 0) {
    return (
      <div className="flex justify-center p-6">
        <p className="text-muted-foreground">No earnings found in this category</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead>Completed Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {earnings.map((earning) => (
            <TableRow key={earning.id}>
              <TableCell className="font-medium">{earning.taskTitle}</TableCell>
              <TableCell>Rs {earning.amount.toFixed(2)}</TableCell>
              <TableCell>{getStatusBadge(earning.status)}</TableCell>
              <TableCell>{formatDate(earning.createdAt)}</TableCell>
              <TableCell>{earning.completedAt ? formatDate(earning.completedAt) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 