"use client"

import { getUserVerificationStatus, uploadCitizenshipDocument } from "@/actions/upload-citizenship"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useUser } from "@clerk/nextjs"
import { AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Eye, FileWarning, Loader2, Upload } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useUploadThing } from "@/lib/uploadthing"

// Define interfaces for the verification result data
interface VerificationData {
  hasDocument: boolean;
  verificationStatus: string | null;
  documentUrls: string[];
  rejectionReason?: string | null;
}

interface VerificationResult {
  success: boolean;
  data?: VerificationData;
  error?: string;
}

export function VerificationCard() {
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<string | null>("pending")
  const [documentUrls, setDocumentUrls] = useState<string[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  
  // Initialize uploadThing hook for direct file uploads
  const { startUpload } = useUploadThing("citizenshipUploader", {
    onClientUploadComplete: (res) => {
      if (!res) return;
      
      // Handle upload completion
      handleUploadComplete(res);
      setIsUploading(false);
      setUploadProgress(0); // Reset progress
      toast.success("Images uploaded successfully!");
    },
    onUploadError: (error) => {
      toast.error(error.message || "Failed to upload image");
      setIsUploading(false);
      setUploadProgress(0); // Reset progress on error
    },
    onUploadProgress: (progress) => {
      console.log("Upload progress:", progress);
      // Store the progress as a single number value
      setUploadProgress(typeof progress === 'number' ? progress : 0);
    },
    onUploadBegin: (fileName) => {
      console.log(`Upload started for ${fileName}`);
      setIsUploading(true);
    },
    // Set to 'all' to get frequent progress updates
    uploadProgressGranularity: 'all',
  });
  
  // Fetch current verification status
  const fetchVerificationStatus = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setIsLoading(true)
      const result = await getUserVerificationStatus(user.id)
      
      if (result.success && result.data) {
        setVerificationStatus(result.data.verificationStatus)
        setDocumentUrls(result.data.documentUrls || [])
        setResult(result)
      }
    } catch (error: unknown) {
      console.error("Error fetching verification status:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])
  
  // Load verification status on component mount
  useEffect(() => {
    fetchVerificationStatus()
  }, [fetchVerificationStatus])
  
  // Upload document handler
  const handleUploadComplete = async (res: { key: string; name: string; url: string; citizenshipPhotoUrl?: string }[]) => {
    if (!user?.id || !res || res.length === 0) return
    
    try {
      // If multiple files are selected, they should replace existing ones
      const replaceExisting = res.length > 1;
      
      // Process all files one by one
      for (let i = 0; i < res.length; i++) {
        const file = res[i];
        // Use citizenshipPhotoUrl from response if available, otherwise fall back to url
        const documentUrl = file.citizenshipPhotoUrl || file.url
        
        const result = await uploadCitizenshipDocument({
          userId: user.id,
          documentUrl,
          // Only set replaceExisting to true for the first file
          // The rest will append normally
          replaceExisting: replaceExisting && i === 0
        })
        
        if (!result.success) {
          toast.error(result.error || "Failed to upload an image")
        }
      }
      
      // Fetch updated status to get all documents after all uploads complete
      await fetchVerificationStatus()
      
    } catch (error: unknown) {
      console.error("Error handling upload:", error)
      toast.error("An error occurred while uploading images")
    } 
  }
  
  // Handle file selection via traditional file input
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      setUploadProgress(10); // Initial progress
      
      try {
        console.log("Starting file upload");
        const files = Array.from(e.target.files);
        
        // Upload the files using uploadThing
        setUploadProgress(30);
        await startUpload(files);
        
        // The result will be handled by the onClientUploadComplete callback
        
      } catch (error) {
        console.error("Error uploading files:", error);
        toast.error("Failed to upload images");
        setIsUploading(false);
        setUploadProgress(0);
      }

      // Clear the input value to allow uploading the same file again if needed
      e.target.value = '';
    }
  };
  
  // Navigate through photos
  const nextPhoto = () => {
    if (documentUrls.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % documentUrls.length)
    }
  }
  
  const prevPhoto = () => {
    if (documentUrls.length > 1) {
      setCurrentPhotoIndex((prev) => (prev - 1 + documentUrls.length) % documentUrls.length)
    }
  }
  
  // Render status message based on verification status
  const renderStatusMessage = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking verification status...</span>
        </div>
      )
    }
    
    switch(verificationStatus) {
      case "verified":
        return (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Verified</AlertTitle>
            <AlertDescription>
              Your account has been verified. You can now access all features.
            </AlertDescription>
          </Alert>
        )
      case "rejected":
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Verification Rejected</AlertTitle>
            <AlertDescription>
              Your verification was rejected. 
              {documentUrls.length > 0 ? " Please upload clearer images." : " Please upload your images."}
              {documentUrls.length > 0 && result?.data?.rejectionReason && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                  <span className="font-semibold">Reason: </span>
                  {result.data.rejectionReason}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )
      case "pending":
        return documentUrls.length > 0 ? (
          <Alert className="bg-yellow-50 border-yellow-200">
            <FileWarning className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-600">Pending Verification</AlertTitle>
            <AlertDescription>
              Your documents have been submitted and are pending review by our team.
              {documentUrls.length < 3 && (
                <p className="text-xs mt-1">
                  You can upload up to {3 - documentUrls.length} more image{documentUrls.length < 2 ? 's' : ''}.
                </p>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="default">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Verification Required</AlertTitle>
            <AlertDescription>
              Please upload your citizenship ID images to verify your identity.
            </AlertDescription>
          </Alert>
        )
      default:
        return (
          <Alert variant="default">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Verification Required</AlertTitle>
            <AlertDescription>
              Please upload your citizenship ID images to verify your identity.
            </AlertDescription>
          </Alert>
        )
    }
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Identity Verification</CardTitle>
        <CardDescription>
          To ensure security and trust, we require all users to verify their identity
          by uploading government-issued citizenship ID images.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {renderStatusMessage()}
        
        {documentUrls.length > 0 && (
          <>
            <div 
              className="aspect-video relative rounded-md overflow-hidden border group cursor-pointer"
              onClick={() => window.open(documentUrls[currentPhotoIndex], '_blank')}
            >
              <Image 
                src={documentUrls[currentPhotoIndex]} 
                alt="Your citizenship document" 
                fill 
                className="object-cover"
              />
              
              {/* Eye icon on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-full bg-white/70 hover:bg-white/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(documentUrls[currentPhotoIndex], '_blank');
                  }}
                >
                  <Eye className="h-5 w-5 text-gray-900" />
                </Button>
              </div>
              
              {documentUrls.length > 1 && (
                <div className="absolute inset-0 flex items-center justify-between z-10">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full bg-white/70 hover:bg-white/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevPhoto();
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full bg-white/70 hover:bg-white/90" 
                    onClick={(e) => {
                      e.stopPropagation();
                      nextPhoto();
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {documentUrls.length > 1 && (
              <div className="flex justify-center space-x-1">
                {documentUrls.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`h-2 w-2 rounded-full ${
                      index === currentPhotoIndex ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Upload Progress Indicator */}
        {isUploading && uploadProgress > 0 && (
          <div className="mt-2 space-y-2">
            <div className="w-full space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-xs font-medium flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  Uploading image... {Math.floor(uploadProgress)}%
                </span>
                <span className="text-xs">{Math.floor(uploadProgress)}%</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {/* Hidden input for file selection */}
        <input
          type="file"
          id="citizenship-upload"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          multiple
        />
        
        <Button 
          variant="outline" 
          disabled={isUploading || verificationStatus === "verified"}
          onClick={() => document.getElementById('citizenship-upload')?.click()}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
} 