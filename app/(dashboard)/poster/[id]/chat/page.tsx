"use client"

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import ChatInterface from "@/components/chat/ChatInterface";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { getAssignmentById } from "@/actions/assignments";

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  
  const [assignment, setAssignment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      router.push("/sign-in");
      return;
    }

    const fetchAssignment = async () => {
      try {
        // Using the server action directly
        const response = await getAssignmentById(id, { posterId: userId });
        
        if (!response.success || !response.assignment) {
          setError(response.error || "Failed to load assignment");
          router.push("/poster");
          return;
        }
        
        // Check if the assignment has a doer assigned
        if (!response.assignment.doerId) {
          router.push(`/poster/${id}`);
          return;
        }
        
        setAssignment(response.assignment);
        setError(null);
      } catch (error) {
        console.error("Error fetching assignment:", error);
        setError("Failed to load assignment");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignment();
  }, [userId, isLoaded, id, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-destructive">{error || "Failed to load assignment"}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chat</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/poster/${id}`}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Assignment
          </Link>
        </Button>
      </div>
      
      <Card className="w-full border rounded-lg overflow-hidden">
        <ChatInterface
          assignmentId={id}
          receiverId={assignment.doerId}
          title={`Chat with ${assignment.doer?.name || "Doer"}`}
          fullHeight
        />
      </Card>
    </div>
  );
} 