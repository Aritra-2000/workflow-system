import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { triggerProjectUpdate, triggerGlobalUpdate } from '@/lib/pusher';
import { getCurrentUserFromHeaders } from '@/lib/auth';
import { notifyTicketUpdate } from '@/lib/notification-service';


export async function GET(req: Request) {
  try {
    const projectId = new URL(req.url).searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    const tickets = await prisma.ticket.findMany({ 
      where: { projectId }, 
      orderBy: { updatedAt: 'desc' },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        updates: {
          orderBy: { timestamp: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        Project: {
          select: {
            createdBy: true
          }
        }
      }
    });

    // Flatten Project.createdBy into the ticket object for easier frontend access
    const ticketsWithCreator = tickets.map(t => ({
      ...t,
      projectCreatorId: t.Project?.createdBy
    }));
    
    return NextResponse.json(ticketsWithCreator);
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserFromHeaders(req.headers);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, title, description, status, priority, dueDate, assigneeId } = await req.json();
    
    if (!projectId || !title || !status) {
      return NextResponse.json(
        { error: 'Project ID, title, and status are required' }, 
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.create({
      data: {
        projectId,
        title,
        description: description || '',
        status,
        priority: priority || 'normal',
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId || null,
        updatedBy: user.email || 'unknown',
        updates: {
          create: {
            userId: user.id,
            changes: {
              title: { from: '', to: title },
              status: { from: '', to: status },
              priority: { from: '', to: priority || 'normal' },
              ...(description ? { description: { from: '', to: description } } : {})
            }
          }
        }
      },
      include: {
        updates: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    const allUsers = await prisma.user.findMany({ select: { id: true } });
    const allRecipients = allUsers.map(u => u.id).filter(Boolean) as string[];
    if (allRecipients.length > 0) {
      const actorArr = (user as { name?: string; email?: string }).name || (user.email ? user.email.split('@')[0] : 'someone');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.activity.createMany({
        data: allRecipients.map(userId => ({
          userId,
          message: `Ticket created by ${actorArr}: ${title}`,
          expiresAt,
        }))
      });
    }

    await triggerProjectUpdate(projectId, 'ticket:created', {});
    await triggerGlobalUpdate('ticket:created', { projectId });
    await triggerGlobalUpdate('notification', {
      type: 'ticket:created',
      projectId,
      timestamp: new Date().toISOString(),
    });
    await notifyTicketUpdate(ticket.id, projectId, user.email || 'unknown', 'created', title);

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Failed to create ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUserFromHeaders(req.headers);
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, status, priority, dueDate, assigneeId, checklists, title, description, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing ticket ID' }, { status: 400 });

    const currentTicket = await prisma.ticket.findUnique({
      where: { id },
      include: { Project: true }
    });

    if (!currentTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { ...updates };
    const trackingChanges: Record<string, unknown> = {};

    if (status && status !== currentTicket.status) {
      updateData.status = status;
      trackingChanges.status = { from: currentTicket.status, to: status };
    }
    if (priority && priority !== currentTicket.priority) {
      updateData.priority = priority;
      trackingChanges.priority = { from: currentTicket.priority, to: priority };
    }
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
      trackingChanges.dueDate = { from: currentTicket.dueDate, to: dueDate };
    }
    if (assigneeId !== undefined && assigneeId !== currentTicket.assigneeId) {
      updateData.assigneeId = assigneeId || null;
      trackingChanges.assigneeId = { from: currentTicket.assigneeId, to: assigneeId || null };
    }
    if (title && title !== currentTicket.title) {
      updateData.title = title;
      trackingChanges.title = { from: currentTicket.title, to: title };
    }
    if (description !== undefined && description !== currentTicket.description) {
      updateData.description = description;
      trackingChanges.description = { from: currentTicket.description, to: description };
    }
    if (checklists !== undefined) {
      updateData.checklists = checklists;
    }

    if (Object.keys(trackingChanges).length > 0) {
      trackingChanges.updatedAt = new Date().toISOString();
      updateData.updates = {
        create: {
          changes: trackingChanges,
          user: { connect: { id: user.id } }
        }
      };
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        Project: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        updates: {
          orderBy: { timestamp: 'desc' },
          take: 5
        }
      }
    });

    if (currentTicket.projectId) {
      await triggerProjectUpdate(currentTicket.projectId, 'ticket:updated', {
        ...updatedTicket,
        updatedBy: user.email,
        actorName: user.name || user.email.split('@')[0],
        ticketTitle: updatedTicket.title,
        status: status || updatedTicket.status,
        changedFields: Object.keys(trackingChanges).filter(k => k !== 'updatedAt')
      });
    }

    await triggerGlobalUpdate('notification', {
      type: status && status !== currentTicket.status ? 'ticket:status-updated' : 'ticket:updated',
      ticketId: updatedTicket.id,
      ticketTitle: updatedTicket.title,
      oldStatus: currentTicket.status,
      newStatus: status ?? currentTicket.status,
      updatedBy: user.email,
      projectId: currentTicket.projectId,
      timestamp: new Date().toISOString()
    });

    const allUsersUpdate = await prisma.user.findMany({ select: { id: true } });
    const recipients = allUsersUpdate.map(u => u.id).filter(Boolean) as string[];
    if (recipients.length > 0) {
      const actor = (user as { name?: string; email?: string }).name || (user.email ? user.email.split('@')[0] : 'someone');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.activity.createMany({
        data: recipients.map(userId => ({
          userId,
          message: status && status !== currentTicket.status
            ? `Ticket status updated by ${actor}: ${updatedTicket.title} → ${status}`
            : `Ticket updated by ${actor}: ${updatedTicket.title}`,
          expiresAt,
        }))
      });
    }

    const action = status && status !== currentTicket.status ? 'status_changed' : 'updated';
    await notifyTicketUpdate(updatedTicket.id, currentTicket.projectId!, user.email || 'unknown', action, updatedTicket.title, status);

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error('Failed to update ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}