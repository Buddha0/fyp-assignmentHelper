"use client"

import { getAllUsers } from "@/actions/admin-users"
import { adminNavItems } from "@/app/(dashboard)/navigation-config"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUser } from "@clerk/nextjs"
import { Role } from "@prisma/client"
import { formatDistanceToNow } from "date-fns"
import { ExternalLink, Loader2, MessageSquare, Search, User } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface UserData {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: Role
  verificationStatus: string | null
  createdAt: Date
  rating: number | null
}

interface PaginationData {
  page: number
  limit: number
  totalPages: number
  totalCount: number
}

export default function AdminUsersPage() {
  const { user } = useUser()
 
  
  // State
  const [users, setUsers] = useState<UserData[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined)
  const [verificationFilter, setVerificationFilter] = useState<string | undefined>(undefined)
  const [selectedTab, setSelectedTab] = useState("all")

  // Fetch users data
  useEffect(() => {
    async function fetchUsers() {
      setLoading(true)
      
      try {
        // Prepare filters based on the selected tab and other filters
        let verificationStatusValue = verificationFilter
        
        if (selectedTab === "verification") {
          verificationStatusValue = "pending"
        }
        
        const result = await getAllUsers(
          pagination.page, 
          pagination.limit,
          {
            role: roleFilter as 'POSTER' | 'DOER' | 'ADMIN' | undefined,
            verificationStatus: verificationStatusValue,
            search: searchQuery || undefined
          }
        )
        
        if (result.success) {
          setUsers(result.data.users)
          setPagination(result.data.pagination)
        } else {
          console.error("Failed to fetch users:", result.error)
          setUsers([])
          // Don't show toast error here, just log it
        }
      } catch (error) {
        console.error("Error loading users:", error)
        setUsers([])
        // Don't show toast error here, just log it
      } finally {
        setLoading(false)
      }
    }
    
    fetchUsers()
  }, [
    pagination.page, 
    pagination.limit, 
    roleFilter, 
    verificationFilter,
    searchQuery,
    selectedTab
  ])
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Reset to first page when searching
    setPagination(prev => ({ ...prev, page: 1 }))
  }
  
  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("")
    setRoleFilter(undefined)
    setVerificationFilter(undefined)
    setSelectedTab("all")
    setPagination(prev => ({ ...prev, page: 1 }))
  }
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setSelectedTab(value)
    
    // Reset page when changing tabs
    setPagination(prev => ({ ...prev, page: 1 }))
    
    // Reset other filters when changing tabs
    setRoleFilter(undefined)
    setVerificationFilter(undefined)
  }
  
  // Handle pagination
  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }
  
  // Get verification status badge
  const getVerificationBadge = (status: string | null) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500">Verified</Badge>
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>
      case "rejected":
        return <Badge className="bg-red-500">Rejected</Badge>
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>
    }
  }
  
  // Get role badge
  const getRoleBadge = (role: Role) => {
    switch (role) {
      case "ADMIN":
        return <Badge className="bg-purple-500">Admin</Badge>
      case "POSTER":
        return <Badge className="bg-blue-500">Poster</Badge>
      case "DOER":
        return <Badge className="bg-green-500">Doer</Badge>
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>
    }
  }

  return (
    <DashboardLayout navItems={adminNavItems} userRole="admin" userName={user?.fullName || "Admin"}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        </div>
        
        {/* Search and filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Search & Filters</CardTitle>
            <CardDescription>Find and filter users based on different criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <label htmlFor="search" className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name or email"
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="role" className="text-sm font-medium">Role</label>
                  <Select value={roleFilter || "all"} onValueChange={(value) => setRoleFilter(value === "all" ? undefined : value)}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      <SelectItem value="POSTER">Poster</SelectItem>
                      <SelectItem value="DOER">Doer</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="verification" className="text-sm font-medium">Verification</label>
                  <Select value={verificationFilter || "all"} onValueChange={(value) => setVerificationFilter(value === "all" ? undefined : value)}>
                    <SelectTrigger id="verification">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end gap-2">
                  <Button type="submit" className="flex-1">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                  <Button type="button" variant="outline" onClick={resetFilters}>
                    Reset
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {/* Users list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Manage all platform users, view their details, and take actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={handleTabChange}>
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="all">All Users</TabsTrigger>
                <TabsTrigger value="verification">Needs Verification</TabsTrigger>
              </TabsList>
              
              <TabsContent value={selectedTab} className="mt-0">
                {loading ? (
                  <div className="flex h-60 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="flex h-60 flex-col items-center justify-center space-y-3 rounded-md border border-dashed p-8 text-center">
                    <User className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery
                          ? "Try adjusting your search or filters"
                          : "There are no users matching your filters"}
                      </p>
                    </div>
                    <Button onClick={resetFilters} variant="outline">
                      Reset filters
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Verification</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarImage src={user.image || undefined} />
                                    <AvatarFallback>
                                      {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{user.name || "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground">{user.email || "No email"}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{getRoleBadge(user.role)}</TableCell>
                              <TableCell>
                                {getVerificationBadge(user.verificationStatus)}
                              </TableCell>
                              <TableCell>
                                {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    asChild
                                    title="View Profile"
                                  >
                                    <Link href={`/dashboard/admin/users/${user.id}`}>
                                      <ExternalLink className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    title="Message User"
                                    asChild
                                  >
                                    <Link href={`/dashboard/admin/support?userId=${user.id}`}>
                                      <MessageSquare className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Pagination */}
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                        {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{" "}
                        {pagination.totalCount} users
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(pagination.page - 1)}
                          disabled={pagination.page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(pagination.page + 1)}
                          disabled={pagination.page >= pagination.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 