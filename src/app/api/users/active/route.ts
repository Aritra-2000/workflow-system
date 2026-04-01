import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, getCurrentUserFromHeaders } from '@/lib/auth';

// Active window (match notification-service: 2 minutes)
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET: Fetch active users
export async function GET() {
  try {
    const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
    
    // Get active users based on updatedAt (last seen)
    const activeUsers = await prisma.user.findMany({
      where: { updatedAt: { gte: since } },
      select: {
        id: true,
        name: true,
        email: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(activeUsers, { 
      status: 200,
      headers: corsHeaders
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch active users' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Update user's active status
export async function POST(req: Request) {
  try {
    // Prefer cookies-based auth for browser heartbeats
    let user = await getCurrentUser();
    if (!user) user = getCurrentUserFromHeaders(req.headers);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Update updatedAt to mark as seen
    await prisma.user.update({ where: { id: user.id }, data: { updatedAt: new Date() } });

    return NextResponse.json(
      { success: true },
      { status: 200, headers: corsHeaders }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to update active status' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}