import { toast as sonnerToast } from 'sonner';

type ToastProps = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  [key: string]: any;
};

// Create a wrapper function for the old toast implementation
function createToast({ 
  title, 
  description, 
  variant = 'default',
  ...props 
}: ToastProps) {
  if (variant === 'destructive') {
    return sonnerToast.error(title || '', {
      description,
      ...props
    });
  }
  
  return sonnerToast(title || '', {
    description,
    ...props
  });
}

// Hook for backward compatibility with the old useToast
function useToast() {
  return {
    toast: createToast,
    dismiss: (toastId?: string) => {
      if (toastId) {
        sonnerToast.dismiss(toastId);
      } else {
        sonnerToast.dismiss();
      }
    }
  };
}

// For direct imports
const toast = createToast;

export { useToast, toast }; 