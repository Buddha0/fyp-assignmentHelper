import { auth } from "@clerk/nextjs/server"; // Clerk's auth function
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 5 },
    pdf: { maxFileSize: "8MB", maxFileCount: 3 },
    text: { maxFileSize: "8MB", maxFileCount: 10 },
    "application/zip": { maxFileSize: "64MB", maxFileCount: 2 },
    "application/x-zip-compressed": { maxFileSize: "64MB", maxFileCount: 2 },
   
  }as unknown as Parameters<typeof f>[0])
  
    // Set permissions and file types for this FileRoute
    .middleware(async () => {
      // This code runs on your server before upload
      const { userId } = await auth(); // Use Clerk's auth function to get user info

      // If no userId, user is not authenticated

      if (!userId) throw new UploadThingError("Unauthorized");

      // Return userId as metadata, accessible in onUploadComplete
      return { userId };
    })
    .onUploadComplete(async ({ metadata }) => {
      // This code RUNS ON YOUR SERVER after upload
      return { uploadedBy: metadata.userId };
    }),

      // Define as many FileRoutes as you like, each with a unique routeSlug
  adminSupportUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 5 },
    pdf: { maxFileSize: "8MB", maxFileCount: 3 },
    text: { maxFileSize: "8MB", maxFileCount: 10 },
    "application/zip": { maxFileSize: "64MB", maxFileCount: 2 },
    "application/x-zip-compressed": { maxFileSize: "64MB", maxFileCount: 2 },
  }as unknown as Parameters<typeof f>[0])
    // Set permissions and file types for this FileRoute
    .middleware(async () => {
      // This code runs on your server before upload
      const { userId } = await auth(); // Use Clerk's auth function to get user info

      // If no userId, user is not authenticated

      if (!userId) throw new UploadThingError("Unauthorized");

      // Return userId as metadata, accessible in onUploadComplete
      return { userId };
    })
    .onUploadComplete(async ({ metadata }) => {
      // This code RUNS ON YOUR SERVER after upload
      return { uploadedBy: metadata.userId };
    }),

  messageUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 5 },
    pdf: { maxFileSize: "8MB", maxFileCount: 3 },
    text: { maxFileSize: "8MB", maxFileCount: 10 },
    "application/zip": { maxFileSize: "64MB", maxFileCount: 2 },
    "application/x-zip-compressed": { maxFileSize: "64MB", maxFileCount: 2 },
  }as unknown as Parameters<typeof f>[0])
    // Set permissions and file types for this FileRoute
    .middleware(async () => {
      // This code runs on your server before upload
      const { userId } = await auth(); // Use Clerk's auth function to get user info

      // If no userId, user is not authenticated

      if (!userId) throw new UploadThingError("Unauthorized");

      // Return userId as metadata, accessible in onUploadComplete
      return { userId };
    })
    .onUploadComplete(async ({ metadata }) => {
      // This code RUNS ON YOUR SERVER after upload
      return { uploadedBy: metadata.userId };
    }),

  fileSubmissionUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 5 },
    pdf: { maxFileSize: "8MB", maxFileCount: 3 },
    text: { maxFileSize: "8MB", maxFileCount: 10 },
    "application/zip": { maxFileSize: "64MB", maxFileCount: 2 },
    "application/x-zip-compressed": { maxFileSize: "64MB", maxFileCount: 2 },
  }as unknown as Parameters<typeof f>[0])
    // Set permissions and file types for this FileRoute
    .middleware(async () => {
      // This code runs on your server before upload
      const { userId } = await auth(); // Use Clerk's auth function to get user info

      // If no userId, user is not authenticated

      if (!userId) throw new UploadThingError("Unauthorized");

      // Return userId as metadata, accessible in onUploadComplete
      return { userId };
    })
    .onUploadComplete(async ({ metadata }) => {
      // This code RUNS ON YOUR SERVER after upload
      return { uploadedBy: metadata.userId };
    }),
  evidence: f({
    image: { maxFileSize: "4MB", maxFileCount: 5 },
    pdf: { maxFileSize: "8MB", maxFileCount: 3 },
    text: { maxFileSize: "8MB", maxFileCount: 10 },
    
    
  })
    // Set permissions and file types for this FileRoute
    .middleware(async () => {
      // This code runs on your server before upload
      const { userId } = await auth(); // Use Clerk's auth function to get user info

      // If no userId, user is not authenticated

      if (!userId) throw new UploadThingError("Unauthorized");

      // Return userId as metadata, accessible in onUploadComplete
      return { userId };
    })
    .onUploadComplete(async ({ metadata }) => {
      // This code RUNS ON YOUR SERVER after upload
      return { uploadedBy: metadata.userId };
    }),

  // Special route for citizenship ID uploads with stricter limits
  citizenshipUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 3 },
  })
    .middleware(async () => {
      const { userId } = await auth();

      if (!userId) throw new UploadThingError("Unauthorized");

      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Return the file URL to be saved in the database
      return {
        uploadedBy: metadata.userId,
        citizenshipPhotoUrl: file.ufsUrl
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
