'use server'

import { UTApi } from "uploadthing/server"

const utapi = new UTApi()

export async function deleteFile(key: string) {
    try {
        if (!key) {
            throw new Error("File key is required")
        }

        await utapi.deleteFiles(key)
        return { success: true }
    } catch (error) {
        console.error("Error deleting file:", error)
        return { success: false, error: "Failed to delete file" }
    }
} 