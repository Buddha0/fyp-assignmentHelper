// Add necessary imports
import { ImageIcon, FileTextIcon, FileIcon } from "lucide-react";

// Improved function to handle file attachments parsing
function getFileAttachments(fileUrls: string | undefined): Array<{ url: string, name: string, type: string }> {
  if (!fileUrls) return [];

  try {
    // If it's a direct URL string (legacy format)
    if (fileUrls.startsWith('http') && !fileUrls.startsWith('{')) {
      const fileName = fileUrls.split('/').pop() || 'file';
      return [{ url: fileUrls, name: fileName, type: 'application/octet-stream' }];
    }

    // Try to parse as JSON
    const parsed = JSON.parse(fileUrls);

    // Handle array of objects
    if (Array.isArray(parsed)) {
      return parsed.map(file => {
        if (typeof file === 'object' && file !== null) {
          return {
            url: file.url || file.ufsUrl || '',
            name: file.name || file.url?.split('/').pop() || 'file',
            type: file.type || 'application/octet-stream'
          };
        } else if (typeof file === 'string') {
          // Handle array of strings
          const fileName = file.split('/').pop() || 'file';
          return { url: file, name: fileName, type: 'application/octet-stream' };
        }
        return { url: '', name: 'file', type: 'application/octet-stream' };
      }).filter(file => file.url);
    } 
    
    // Handle single object
    if (typeof parsed === 'object' && parsed !== null) {
      return [{
        url: parsed.url || parsed.ufsUrl || '',
        name: parsed.name || 'file',
        type: parsed.type || 'application/octet-stream'
      }];
    }

    return [];
  } catch (error) {
    // If it's not valid JSON, treat it as a direct URL
    if (fileUrls) {
      const fileName = fileUrls.split('/').pop() || 'file';
      return [{ url: fileUrls, name: fileName, type: 'application/octet-stream' }];
    }
    console.error("Error parsing file URLs:", error);
    return [];
  }
}

// Export the component - assuming this is its actual implementation
// Replace this with your actual component implementation
export function ChatInterface() {
  // Render your chat interface here
  return (
    <div className="chat-interface">
      {/* Your chat interface code */}
    </div>
  );
}

// This allows the FileAttachments renderer to be used elsewhere
export function renderFileAttachments(message: { fileUrls?: string }) {
  if (!message.fileUrls) return null;
  
  return (
    <div className="flex flex-col gap-2 mb-2">
      {getFileAttachments(message.fileUrls).map((file, index) => {
        const isImage = file.type?.startsWith('image/') || file.url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
        const isPdf = file.type === 'application/pdf' || file.url.endsWith('.pdf');
        
        // Extract a better display name
        const displayName = file.name || file.url.split('/').pop() || `File ${index + 1}`;
        
        return (
          <a 
            key={index}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            download={displayName}
            className="flex items-center gap-2 p-2 rounded-md bg-primary-foreground/40 hover:bg-primary-foreground/60 transition-colors"
          >
            {isImage ? (
              <ImageIcon className="h-5 w-5 text-primary" />
            ) : isPdf ? (
              <FileTextIcon className="h-5 w-5 text-primary" />
            ) : (
              <FileIcon className="h-5 w-5 text-primary" />
            )}
            <span className="text-sm truncate max-w-[200px]">{displayName}</span>
          </a>
        );
      })}
    </div>
  );
} 