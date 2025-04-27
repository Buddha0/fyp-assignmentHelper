"use client";

import { switchUserRole } from "@/actions/user-role";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface RoleSwitcherProps {
  currentRole: string;
}

export function RoleSwitcher({ currentRole }: RoleSwitcherProps) {
  const [isLoading, setIsLoading] = useState(false);


  const handleRoleSwitch = async (newRole: string) => {
    if (newRole === currentRole) return;
    
    setIsLoading(true);
    
    try {
      const result = await switchUserRole(newRole);
      
      if (result.success) {
        toast.success(`Switched to ${newRole.toLowerCase()} mode`);
        
        // Redirect based on the new role
        const redirectPath = newRole === "POSTER" 
          ? "/poster" 
          : newRole === "DOER" 
          ? "/doer" 
          : "/";
        
        // Force a hard refresh to ensure the new role is reflected
        window.location.href = redirectPath;
      } else {
        toast.error(result.error || "Failed to switch role");
      }
    } catch (error) {
      console.error("Error switching role:", error);
      toast.error("An error occurred while switching roles");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-1" disabled={isLoading}>
          {isLoading ? "Switching..." : `Mode: ${currentRole}`}
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleRoleSwitch("POSTER")}
          className="flex items-center justify-between"
        >
          Poster
          {currentRole === "POSTER" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleRoleSwitch("DOER")}
          className="flex items-center justify-between"
        >
          Doer
          {currentRole === "DOER" && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 