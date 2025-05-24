"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useUploadThing } from "@/lib/uploadthing"
import { Loader2, Paperclip, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

interface DisputeResponseFormProps {
  disputeId: string
  assignmentTitle: string
}

export function DisputeResponseForm({ disputeId, assignmentTitle }: DisputeResponseFormProps) {
  const [response, setResponse] = useState("")
  const [evidence, setEvidence] = useState<Array<{ url: string; name: string; type: string }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  
  // Initialize the useUploadThing hook
  const { startUpload } = useUploadThing("evidence", {
    onClientUploadComplete: (res) => {
      if (res) {
        // Add newly uploaded files to evidence state
        setEvidence(prev => [
          ...prev,
          ...res.map(file => ({
            url: file.url,
            name: file.name,
            type: file.type || 'application/octet-stream'
          }))
        ])
        toast.success(`Uploaded ${res.length} file(s) successfully`)
      }
      setIsUploading(false)
      setUploadProgress(0) // Reset progress
    },
    onUploadBegin: () => {
      setIsUploading(true)
    },
    onUploadProgress: (progress) => {
            // Store the progress as a number value
      setUploadProgress(typeof progress === 'number' ? progress : 0)
    },
    onUploadError: (error) => {
      toast.error(`Error uploading: ${error.message}`)
      setIsUploading(false)
      setUploadProgress(0) // Reset progress on error
    },
    // Set to 'all' to get frequent progress updates
    uploadProgressGranularity: 'all',
  })

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const fileArray = Array.from(files)
      startUpload(fileArray)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!response.trim()) {
      toast.error("Please provide a response to the dispute")
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // Prepare the evidence data as a proper JSON object
      const evidenceData = evidence.length > 0 ? 
        evidence.map(file => ({
          url: file.url,
          name: file.name,
          type: file.type
        })) : 
        [];
      
      // Submit response with evidence
      const res = await fetch("/api/disputes/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          disputeId,
          response,
          // Pass evidence as a stringified JSON to ensure it's treated as JSON
          evidence: evidenceData
        })
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to submit response")
      }
      
      toast.success("Your response has been submitted successfully")
      
      // Refresh the page to show the submitted response
      router.refresh()
      
      // Reset form
      setResponse("")
      setEvidence([])
      
    } catch (error) {
      console.error("Error submitting response:", error)
      toast.error(error instanceof Error ? error.message : "Failed to submit response")
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeFile = (index: number) => {
    setEvidence(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    return '📎';
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Respond to Dispute</CardTitle>
        <CardDescription>
          Provide your side of the story for dispute on {assignmentTitle}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div>
            <Textarea 
              placeholder="Explain your side of the dispute..."
              className="min-h-[150px]"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Upload Evidence (Optional)</div>
            
            {/* Custom file upload implementation */}
            <div className="flex flex-col gap-2">
              {/* Hidden file input */}
              <input
                type="file"
                id="dispute-file-upload"
                className="hidden"
                multiple
                onChange={handleFileInputChange}
                ref={fileInputRef}
              />
              
              <Button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSubmitting}
                variant="outline"
                className="flex items-center gap-2 w-fit"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                <span>
                  {isUploading 
                    ? uploadProgress > 0
                      ? `Uploading (${Math.floor(uploadProgress)}%)`
                      : 'Uploading...'
                    : 'Upload Evidence Files'}
                </span>
              </Button>
              
              {/* Display upload progress */}
              {isUploading && uploadProgress > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="w-full space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Upload Progress</span>
                      <span>{Math.floor(uploadProgress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-black" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {evidence.length > 0 && (
              <div className="mt-4 space-y-2 p-3 border rounded-md bg-muted/30">
                <h4 className="text-sm font-medium mb-2">Uploaded Files:</h4>
                {evidence.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg">{getFileIcon(file.type)}</span>
                      <span className="truncate font-medium">{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-full"
                      onClick={() => removeFile(index)}
                      disabled={isUploading || isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            disabled={isSubmitting || isUploading || !response.trim()}
            className="w-full mt-4"
          >
            {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? "Uploading Files..." : isSubmitting ? "Submitting Response..." : "Submit Response"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
} 