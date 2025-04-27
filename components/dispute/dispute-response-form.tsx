"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Paperclip, X } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useUploadThing } from "@/lib/uploadthing"
import { deleteFile } from "@/actions/utility/file-utility"

interface DisputeResponseFormProps {
  disputeId: string
  assignmentTitle: string
}

export function DisputeResponseForm({ disputeId, assignmentTitle }: DisputeResponseFormProps) {
  const [response, setResponse] = useState("")
  const [attachments, setAttachments] = useState<Array<{
    name: string;
    size: number;
    url: string;
    key: string;
  }>>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingFile, setDeletingFile] = useState<number | null>(null)
  const router = useRouter()

  // Define file upload permissions and constraints
  const permittedFileInfo = {
    config: {
      maxSize: 10, // 10MB maximum file size
      maxFileCount: 5, // Maximum 5 files allowed
      acceptedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.zip']
    }
  }

  // Initialize the useUploadThing hook
  const { startUpload } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res) => {
      if (!res) return;
      
      const newFiles = res.map((file) => ({
        name: file.name,
        size: file.size,
        url: file.url,
        key: file.key
      }));
      
      setAttachments(prev => [...prev, ...newFiles]);
      setIsUploading(false);
      setUploadProgress(0); // Reset progress
      toast.success("Files uploaded successfully!");
    },
    onUploadError: (error) => {
      toast.error(error.message || "Failed to upload file");
      setIsUploading(false);
      setUploadProgress(0); // Reset progress on error
    },
    onUploadProgress: (progress) => {
      // Store the progress as a single number value
      setUploadProgress(typeof progress === 'number' ? progress : 0);
    },
    onUploadBegin: (fileName) => {
      console.log(`Upload started for ${fileName}`);
    },
    // Set to 'all' to get frequent progress updates
    uploadProgressGranularity: 'all',
  })

  const handleRemoveFile = async (index: number) => {
    const fileToRemove = attachments[index]
    setDeletingFile(index)
    
    try {
      const result = await deleteFile(fileToRemove.key)

      if (!result.success) {
        throw new Error(result.error)
      }

      // Remove from local state only if delete was successful
      setAttachments(prev => prev.filter((_, i) => i !== index))
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error('Failed to delete file. Please try again.')
    } finally {
      setDeletingFile(null)
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
      
      // Format attachments for API
      const formattedAttachments = attachments.map(file => ({
        url: file.url,
        name: file.name
      }))
      
      // Submit response with evidence
      const res = await fetch("/api/disputes/respond", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          disputeId,
          response,
          evidence: formattedAttachments
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
      setAttachments([])
      
    } catch (error) {
      console.error("Error submitting response:", error)
      toast.error(error instanceof Error ? error.message : "Failed to submit response")
    } finally {
      setIsSubmitting(false)
    }
  }
  
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
              placeholder="Explain your position clearly. Be specific and provide relevant details to support your case."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={6}
              className="w-full"
              required
            />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium mb-2">Evidence (Optional)</p>
            <div className="flex items-center gap-2">
              {/* Custom file upload implementation */}
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    // Get files from input
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      // Convert FileList to array for startUpload
                      const fileArray = Array.from(files);
                      setIsUploading(true);
                      // Start the upload
                      startUpload(fileArray);
                    }
                  }}
                />
                <button 
                  type="button"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isUploading || isSubmitting}
                  className="bg-[#171717] text-white p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                          : 'Choose Files'}
                  </span>
                </button>
              </div>
            </div>
            
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
                    ></div>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              Upload any relevant files or resources {permittedFileInfo?.config ? 
                `(${permittedFileInfo.config.maxSize} MB max` + 
                `${permittedFileInfo.config.maxFileCount ? `, ${permittedFileInfo.config.maxFileCount} files max` : ""})` : 
                "(max 5 files, 10MB each)"}
            </p>
            {permittedFileInfo?.config?.acceptedTypes && (
              <p className="text-xs text-muted-foreground">
                Allowed files: {permittedFileInfo.config.acceptedTypes.join(", ")}
              </p>
            )}
            
            {/* Display uploaded files */}
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 pr-4 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      disabled={deletingFile === index}
                      className="text-muted-foreground hover:text-destructive focus:outline-none"
                    >
                      {deletingFile === index ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
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