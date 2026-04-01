import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserFromHeaders } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
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

    const isProjectCreator = project.createdBy === actor.id;

    // Check if actor is a member of the project
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: actor.id
        }
      }
    });

    if (!isMember && !isSuperUser && !isProjectCreator) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view members' }, { status: 403 });
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(members.map(m => ({
      memberId: m.id,
      ...m.user,
      role: m.role
    })));
  } catch (error) {
    console.error('Failed to fetch project members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { email, role } = await req.json();

    if (!projectId || !email) {
      return NextResponse.json({ error: 'Project ID and Email are required' }, { status: 400 });
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

    // 1. Find or create the user by email
    const user = await prisma.user.upsert({
      where: { email },
      create: { email },
      update: {}
    });

    // 2. Add as member if not already
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: user.id
        }
      }
    });

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this project' }, { status: 400 });
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: user.id,
        role: role || 'MEMBER'
      },
      include: {
        user: true
      }
    });

    // 3. Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        projectId,
        message: `You were added to project ${projectId} by ${actor.email}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return NextResponse.json({
      memberId: member.id,
      ...member.user,
      role: member.role
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to add project member:', error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}
