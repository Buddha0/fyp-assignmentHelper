import { SidebarProvider } from "@/components/ui/sidebar"
import type React from "react"


export const metadata = {
  title: "Assignment Helper Platform",
  description: "A platform connecting task posters with doers",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>{children}</SidebarProvider>
  )
}

