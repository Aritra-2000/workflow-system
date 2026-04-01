import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeaders } from '@/lib/auth';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: projectId, memberId } = await params;
    if (!projectId || !memberId) {
      return NextResponse.json({ error: 'Project ID and Member ID are required' }, { status: 400 });
    }

    const actor = await getCurrentUserFromHeaders(req.headers);
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a Super User (via secret header)
    const superUserPass = req.headers.get('x-superuser-pass');
    const isSuperUser = superUserPass === process.env.SUPER_USER_PASSWORD;

    // Get the project to check for creator
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { createdBy: true }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Permission check: Super User OR Project Creator
    const isProjectCreator = project.createdBy === actor.id;

    if (!isSuperUser && !isProjectCreator) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to manage members' }, { status: 403 });
    }

    // 1. Delete the membership
    const deleted = await prisma.projectMember.delete({
      where: {
        id: memberId,
        projectId // Extra safety check
      }
    });

    // 2. Log activity
    await prisma.activity.create({
      data: {
        userId: deleted.userId,
        projectId,
        message: `You were removed from project ${projectId} by ${actor.email}`,
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to remove project member:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
