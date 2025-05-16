"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Calendar, CheckCircle, Clock, MessageSquare, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AcceptBidButton } from "./accept-bid-button";

interface BidItemProps {
  bid: {
    id: string;
    price: number;
    deliveryTime: number;
    message: string;
    createdAt: Date;
    doer: {
      id: string;
      name: string;
      image?: string;
      completedJobs?: number;
      rating?: number;
      hourlyRate?: number;
    };
  };
  taskId: string;
  taskStatus: string;
  userRole?: "poster" | "doer";
  onAccept?: () => void;
}

export function BidItem({ bid, taskId, taskStatus, userRole = "poster", onAccept }: BidItemProps) {
  const [messageExpanded, setMessageExpanded] = useState(false);
  const isTaskAssigned = taskStatus === "ASSIGNED" || taskStatus === "IN_PROGRESS" || taskStatus === "COMPLETED";
  
  // Format delivery time
  const formatDeliveryTime = (days: number) => {
    if (days === 1) return "1 day";
    return `${days} days`;
  };
  
  // Determine the correct profile path based on user role
  const profilePath = userRole === "poster" 
    ? `/poster/profile/${bid.doer.id}` 
    : `/doer/profile/${bid.doer.id}`;
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Link href={profilePath} className="hover:opacity-80 transition-opacity">
              <Avatar className="h-10 w-10 cursor-pointer">
                <AvatarImage src={bid.doer.image || ""} alt={bid.doer.name} />
                <AvatarFallback>{bid.doer.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link href={profilePath} className="hover:underline">
                <CardTitle className="text-base">{bid.doer.name}</CardTitle>
              </Link>
              <CardDescription className="flex items-center gap-1">
                {bid.doer.rating && (
                  <div className="flex items-center">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                    <span className="text-xs">{bid.doer.rating.toFixed(1)}</span>
                  </div>
                )}
                {bid.doer.completedJobs !== undefined && (
                  <div className="flex items-center ml-2">
                    <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-xs">{bid.doer.completedJobs} jobs completed</span>
                  </div>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">Rs {bid.price.toFixed(2)}</p>
            <div className="flex items-center justify-end text-muted-foreground text-xs">
              <Clock className="h-3 w-3 mr-1" />
              <span>Delivery: {formatDeliveryTime(bid.deliveryTime)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="text-sm text-muted-foreground">
          <p className={messageExpanded ? "" : "line-clamp-2"}>
            {bid.message}
          </p>
          {bid.message.length > 120 && (
            <Button 
              variant="link" 
              className="p-0 h-auto text-xs" 
              onClick={() => setMessageExpanded(!messageExpanded)}
            >
              {messageExpanded ? "Show less" : "Show more"}
            </Button>
          )}
        </div>
        <div className="mt-2 text-xs text-muted-foreground flex items-center">
          <Calendar className="h-3 w-3 mr-1" />
          <span>Bid placed {formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-0">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${userRole}/messages/${taskId}/${bid.doer.id}`}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={profilePath}>
              View Profile
            </Link>
          </Button>
        </div>
        
        {!isTaskAssigned && (
          <AcceptBidButton 
            bidId={bid.id} 
            taskId={taskId}
            doerName={bid.doer.name}
            amount={bid.price}
            onSuccess={onAccept}
          />
        )}
      </CardFooter>
    </Card>
  );
} 