import { NextResponse } from "next/server";
import {prisma} from "@/lib/db";
import { getCurrentUserFromHeaders } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const user = getCurrentUserFromHeaders(req.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a Super User (via secret header)
    const superUserPass = req.headers.get('x-superuser-pass');
    const isSuperUser = superUserPass === process.env.SUPER_USER_PASSWORD;

    if (!isSuperUser) {
      return NextResponse.json({ error: "Forbidden: Only Super Users can delete projects" }, { status: 403 });
    }

    // Perform cascading deletes in a transaction to satisfy FK constraints
    await prisma.$transaction(async (tx) => {
      // 1) Delete ticket updates for all tickets in the project
      const tickets = await tx.ticket.findMany({
        where: { projectId },
        select: { id: true },
      });
      const ticketIds = tickets.map((t) => t.id);
      if (ticketIds.length > 0) {
        await tx.ticketUpdate.deleteMany({ where: { ticketId: { in: ticketIds } } });
      }

      // 2) Delete tickets
      await tx.ticket.deleteMany({ where: { projectId } });

      // 3) Delete activities that reference this project
      await tx.activity.deleteMany({ where: { projectId } });

      // 4) Delete project members (in case DB doesn't cascade)
      await tx.projectMember.deleteMany({ where: { projectId } });

      // 5) Finally delete the project
      await tx.project.delete({ where: { id: projectId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    const message = error instanceof Error ? error.message : 'Failed to delete project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
