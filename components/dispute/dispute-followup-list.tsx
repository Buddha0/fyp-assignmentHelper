"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Download, FileText } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface DisputeFollowupListProps {
  followups: Array<{
    id: string
    message: string
    createdAt: string
    evidence?: Array<{
      name: string
      url: string
    }>
    sender: {
      id: string
      name: string
      image?: string
    }
  }>
  currentUserId: string
}

export function DisputeFollowupList({ followups, currentUserId }: DisputeFollowupListProps) {
  if (!followups || followups.length === 0) {
    return null
  }

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-md font-medium">Follow-up Messages</h3>
      
      <div className="space-y-4">
        {followups.map((followup) => (
          <Card 
            key={followup.id} 
            className={`overflow-hidden ${
              followup.sender.id === currentUserId 
                ? "border-l-4 border-l-blue-500" 
                : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={followup.sender.image || ""} alt={followup.sender.name} />
                  <AvatarFallback>{followup.sender.name.charAt(0)}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {followup.sender.id === currentUserId ? "You" : followup.sender.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(followup.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2 whitespace-pre-wrap text-sm">
                    {followup.message}
                  </div>
                  
                  {followup.evidence && followup.evidence.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Attached Files</p>
                      <div className="space-y-2">
                        {followup.evidence.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 truncate">{file.name}</span>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
                            >
                              <Download className="h-4 w-4" />
                              <span className="text-xs">Download</span>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 