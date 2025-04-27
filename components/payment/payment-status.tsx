// "use client";

// import { Badge } from "@/components/ui/badge";
// import { getPaymentStatusInfo } from "@/lib/utils";

// interface PaymentStatusProps {
//   status: string; // This can be "PENDING", "PAID", "COMPLETED", "RELEASED", "REFUNDED", "FAILED"
//   className?: string;
//   withLabel?: boolean;
//   size?: "sm" | "md" | "lg";
// }

// export function PaymentStatus({ 
//   status, 
//   className = "", 
//   withLabel = true,
//   size = "md"
// }: PaymentStatusProps) {
//   const { label, bgColor, icon: Icon } = getPaymentStatusInfo(status);
  
//   // Size variants
//   const sizeClasses = {
//     sm: "text-xs px-2 py-0.5",
//     md: "text-sm px-2.5 py-0.5",
//     lg: "px-3 py-1"
//   };
  
//   // Icon size based on badge size
//   const iconSize = {
//     sm: 12,
//     md: 14,
//     lg: 16
//   };
  
//   return (
//     <Badge 
//       variant="outline" 
//       className={`${bgColor} ${sizeClasses[size]} ${className} gap-1 font-medium`}
//     >
//       <Icon className={`h-${iconSize[size]/4} w-${iconSize[size]/4}`} />
//       {withLabel && label}
//     </Badge>
//   );
// } 