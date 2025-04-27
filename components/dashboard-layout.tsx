"use client"


import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger
} from "@/components/ui/sidebar"
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type React from "react"
import { type ReactNode } from "react"
import { SupportChatButton } from "@/components/support/support-chat-button"
import { NotificationBell } from "@/components/notifications/notification-bell"

interface DashboardLayoutProps {
  children: ReactNode
  navItems: {
    href: string
    label: string
    icon: React.ElementType
  }[]
  userRole: string
  userName: string
  userAvatar?: string
}

export function DashboardLayout({ children, navItems, userRole }: DashboardLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen w-full max-w-[100%]">
      <Sidebar>
        <SidebarHeader className="border-b px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              AH
            </div>
            <span className="text-lg font-semibold">Assignment Helper</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <div className="px-4 py-2">
            <p className="mb-2 text-xs font-medium text-muted-foreground">{userRole.toUpperCase()}</p>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </div>
          <div className="p-4 border-t mt-auto">
            <SupportChatButton />
          </div>
        </SidebarContent>
        <SidebarFooter className="border-t p-4">
     
        </SidebarFooter>
      </Sidebar>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <SidebarTrigger />

     

          <div className="ml-auto flex items-center gap-2">
            {/* <NotificationsPanel /> */}
            <NotificationBell />
          

            <SignedOut>
              <SignInButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>

          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 w-full">{children}</main>
      </div>
    </div>
  )
}

