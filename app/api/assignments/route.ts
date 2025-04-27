import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: "Unauthorized" 
      }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    
    // Build the query
    const query: any = {};
    
    // Add status filter if provided
    if (status) {
      query.status = status;
    }
    
    // Get assignments
    const assignments = await prisma.assignment.findMany({
      where: query,
      orderBy: {
        createdAt: "desc"
      },
      include: {
        poster: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        doer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        bids: {
          select: {
            id: true,
            bidAmount: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      assignments,
    });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch assignments" 
    }, { status: 500 });
  }
} 