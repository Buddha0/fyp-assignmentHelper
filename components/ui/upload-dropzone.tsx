import React from 'react';
import { UploadCloud } from 'lucide-react';

interface UploadDropzoneProps {
  className?: string;
  endpoint: string;
  onClientUploadComplete: (res: any[]) => void;
  onUploadError: (error: Error) => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  className,
  onClientUploadComplete,
  onUploadError
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Mock file upload logic - replace with your actual implementation
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Simulate upload - in a real app, you'd call your API here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock response
      const uploadResults = Array.from(files).map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        ufsUrl: URL.createObjectURL(file)
      }));
      
      onClientUploadComplete(uploadResults);
    } catch (error) {
      onUploadError(error instanceof Error ? error : new Error('Upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div 
      className={`relative border-2 border-dashed rounded-md p-4 transition-colors ${
        isDragging ? 'bg-muted/50 border-primary' : 'border-muted-foreground/30'
      } ${className}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileUpload(e.dataTransfer.files);
      }}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => handleFileUpload(e.target.files)}
      />
      
      <div className="flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
        <UploadCloud className="h-6 w-6 text-primary ut-allowed-content" />
        <span className="font-medium ut-label">
          {isUploading ? 'Uploading...' : 'Click or drag files to upload'}
        </span>
        <span className="text-xs">
          Upload files for this message
        </span>
      </div>
    </div>
  );
}; 