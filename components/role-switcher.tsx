"use client"
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Role } from "@prisma/client";

export function RoleSwitcher({ currentRole }: { currentRole: Role }) {
  const router = useRouter();

  const handleRoleSwitch = async () => {
    const newRole = currentRole === "POSTER" ? "DOER" : "POSTER";
    
    try {
      const response = await fetch("/api/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        router.refresh();
        router.push(`/dashboard/${newRole.toLowerCase()}`);
      }
    } catch (error) {
      console.error("Failed to switch role:", error);
    }
  };

  return (
    <Button onClick={handleRoleSwitch} variant="outline">
      Switch to {currentRole === "POSTER" ? "Doer" : "Poster"}
    </Button>
  );
}