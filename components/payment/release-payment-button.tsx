// "use client";

// import { Button } from "@/components/ui/button";
// import { 
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle 
// } from "@/components/ui/dialog";
// import { Loader2 } from "lucide-react";
// import { useState } from "react";
// import { toast } from "sonner";
// import { releasePayment } from "@/actions/payments";

// interface ReleasePaymentButtonProps {
//   assignmentId: string;
//   disabled?: boolean;
//   onSuccess?: () => void;
// }

// export function ReleasePaymentButton({ 
//   assignmentId,
//   disabled = false,
//   onSuccess
// }: ReleasePaymentButtonProps) {
//   const [loading, setLoading] = useState(false);
//   const [dialogOpen, setDialogOpen] = useState(false);

//   const handleReleasePayment = async () => {
//     setLoading(true);
    
//     try {
//       const result = await releasePayment(assignmentId);
      
//       if (result.success) {
//         toast.success("Payment released successfully");
//         setDialogOpen(false);
        
//         if (onSuccess) {
//           onSuccess();
//         }
//       } else {
//         toast.error(result.error || "Failed to release payment");
//       }
//     } catch (error) {
//       console.error("Error releasing payment:", error);
//       toast.error("An error occurred while releasing payment");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <>
//       <Button 
//         variant="outline" 
//         disabled={disabled}
//         onClick={() => setDialogOpen(true)}
//       >
//         Release Payment
//       </Button>
      
//       <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Confirm Payment Release</DialogTitle>
//             <DialogDescription>
//               Are you sure you want to release the payment? This action cannot be undone.
//               Only release payment when you are fully satisfied with the work.
//             </DialogDescription>
//           </DialogHeader>
          
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setDialogOpen(false)}>
//               Cancel
//             </Button>
//             <Button 
//               onClick={handleReleasePayment} 
//               disabled={loading}
//             >
//               {loading ? (
//                 <>
//                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                   Releasing...
//                 </>
//               ) : (
//                 "Release Payment"
//               )}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// } 