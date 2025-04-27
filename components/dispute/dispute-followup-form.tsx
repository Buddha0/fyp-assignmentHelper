"use client"

import { addDisputeFollowUp } from "@/actions/disputes"
import { deleteFile } from "@/actions/utility/file-utility"
import { getUserId } from "@/actions/utility/user-utilit"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useUploadThing } from "@/lib/uploadthing"
import { Loader2, Paperclip, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

interface DisputeFollowupFormProps {
  disputeId: string
  assignmentTitle: string
}

export function DisputeFollowupForm({ disputeId }: DisputeFollowupFormProps) {
  const [message, setMessage] = useState("")
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
  // const permittedFileInfo = {
  //   config: {
  //     maxSize: 10, // 10MB maximum file size
  //     maxFileCount: 5, // Maximum 5 files allowed
  //     acceptedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.zip']
  //   }
  // }

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
    
    if (!message.trim()) {
      toast.error("Please provide a follow-up message")
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // Get the current user's ID
      const userId = await getUserId()
      
      if (!userId) {
        throw new Error("You need to be logged in to send follow-up messages")
      }
      
      // Format attachments for API
      const formattedAttachments = attachments.map(file => ({
        url: file.url,
        name: file.name,
        type: "file"
      }))
      
      // Submit follow-up message with evidence using the direct function
      const result = await addDisputeFollowUp(
        disputeId,
        userId,
        message,
        formattedAttachments.length > 0 ? formattedAttachments : undefined
      )
      
      if (!result.success) {
        throw new Error(result.error || "Failed to submit follow-up message")
      }
      
      toast.success("Your follow-up message has been submitted successfully")
      
      // Refresh the page to show the submitted message
      router.refresh()
      
      // Reset form
      setMessage("")
      setAttachments([])
      
    } catch (error) {
      console.error("Error submitting follow-up message:", error)
      toast.error(error instanceof Error ? error.message : "Failed to submit follow-up message")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Card className="mt-6 border-dashed border-2 border-muted-foreground/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Add Follow-up Information</CardTitle>
        <CardDescription>
          Provide additional details or evidence for this dispute
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div>
            <Textarea 
              placeholder="Add any additional information that might help resolve this dispute..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full"
              required
            />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium mb-2">Additional Evidence (Optional)</p>
            <div className="flex items-center gap-2">
              {/* Custom file upload implementation */}
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  id="followup-file-upload"
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
                  onClick={() => document.getElementById('followup-file-upload')?.click()}
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
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="submit"
            disabled={isSubmitting || isUploading || !message.trim()}
            className="w-full"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Additional Information
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
} 