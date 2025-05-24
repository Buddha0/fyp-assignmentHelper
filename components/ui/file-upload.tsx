"use client";

import { useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";
import { Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  endpoint: string;
  maxFiles?: number;
  maxSize?: number;
  acceptedTypes?: string[];
  onUploadComplete?: (files: Array<{ url: string; name: string; type?: string }>) => void;
  existingFiles?: Array<{ url: string; name: string; type?: string }>;
  onFileRemove?: (index: number) => void;
  className?: string;
  buttonText?: string;
  helperText?: string;
}

export function FileUpload({
  endpoint,
  maxFiles = 5,
  maxSize = 10,
  acceptedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.zip'],
  onUploadComplete,
  existingFiles = [],
  onFileRemove,
  className = "",
  buttonText = "Choose Files",
  helperText
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState<Array<{ url: string; name: string; type?: string }>>(existingFiles);
  const [deletingFile, setDeletingFile] = useState<number | null>(null);

  const { startUpload } = useUploadThing(endpoint as "imageUploader" | "fileSubmissionUploader" | "evidence" | "messageUploader" | "adminSupportUploader", {
    onClientUploadComplete: (res) => {
      if (!res) return;
      
      const newFiles = res.map((file) => ({
        url: file.url,
        name: file.name,
        type: file.type || 'application/octet-stream'
      }));
      
      setFiles(prev => [...prev, ...newFiles]);
      setIsUploading(false);
      setUploadProgress(0);
      onUploadComplete?.(newFiles);
      toast.success("Files uploaded successfully!");
    },
    onUploadError: (error) => {
      toast.error(error.message || "Failed to upload file");
      setIsUploading(false);
      setUploadProgress(0);
    },
    onUploadProgress: (progress) => {
      setUploadProgress(typeof progress === 'number' ? progress : 0);
    },
    onUploadBegin: () => {
      setIsUploading(true);
    },
    uploadProgressGranularity: 'all',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    // Check file count
    if (files.length + fileList.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Check file sizes
    const oversizedFiles = Array.from(fileList).filter(
      file => file.size > maxSize * 1024 * 1024
    );
    if (oversizedFiles.length > 0) {
      toast.error(`Some files exceed the maximum size of ${maxSize}MB`);
      return;
    }

    // Check file types
    const invalidFiles = Array.from(fileList).filter(
      file => !acceptedTypes.some(type => file.name.toLowerCase().endsWith(type))
    );
    if (invalidFiles.length > 0) {
      toast.error(`Some files have invalid types. Allowed types: ${acceptedTypes.join(", ")}`);
      return;
    }

    const fileArray = Array.from(fileList);
    startUpload(fileArray);
  };

  const handleRemoveFile = async (index: number) => {
    setDeletingFile(index);
    try {
      if (onFileRemove) {
        await onFileRemove(index);
      }
      setFiles(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Error removing file:", error);
      toast.error("Failed to remove file");
    } finally {
      setDeletingFile(null);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col gap-2">
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          onChange={handleFileChange}
          accept={acceptedTypes.join(",")}
          disabled={isUploading}
        />
        <button 
          type="button"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={isUploading}
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
              : buttonText}
          </span>
        </button>
      </div>

      {/* Upload Progress */}
      {isUploading && uploadProgress > 0 && (
        <div className="space-y-2">
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

      {/* Helper Text */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          {helperText || `Upload files (${maxSize}MB max, ${maxFiles} files max)`}
        </p>
        {acceptedTypes && (
          <p className="text-xs text-muted-foreground">
            Allowed files: {acceptedTypes.join(", ")}
          </p>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 pr-4 border rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <button
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
  );
} 