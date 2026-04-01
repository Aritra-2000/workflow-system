"use client";

import { useEffect, useState, useCallback } from "react";
import { apiPatch, apiPost } from "@/lib/api-client";
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectPusher } from "@/hooks/useSocket";
import { useSuperUserStore } from "@/store/useSuperUserStore";
import { toast } from "react-hot-toast";
import Loading from "@/app/loading";
import RichTextEditor from "./RichTextEditor";
import EditTaskModal from "./EditTaskModal";
import ProjectMembersModal from "./ProjectMembersModal";
import { Users as UsersIcon, Settings as SettingsIcon, Plus, UserPlus, Flag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// ---------------- Types ----------------

type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

type UserUpdate = {
  email: string;
  timestamp: string;
  status: string;
};

type Ticket = {
  id: string;
  title: string;
  status: string;
  description: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
  projectId: string;
  checklists: any;
  updatedAt: string;
  updatedBy?: string;
  updateHistory?: UserUpdate[];
  updates?: Array<{
    user?: { email?: string };
    timestamp?: string;
    updatedAt?: string;
    changes?: string | { status?: string };
  }>;
  projectCreatorId?: string;
  assignee?: User | null;
};

// ---------------- Columns ----------------

const columns = [
  { id: "proposed", title: "Proposed", color: "bg-pink-100 text-pink-700", gradient: "from-pink-500 to-rose-500", badge: "bg-pink-500" },
  { id: "todo", title: "Todo", color: "bg-purple-100 text-purple-700", gradient: "from-purple-500 to-indigo-500", badge: "bg-purple-500" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-100 text-blue-700", gradient: "from-blue-500 to-cyan-500", badge: "bg-blue-500" },
  { id: "done", title: "Done", color: "bg-green-100 text-green-700", gradient: "from-green-500 to-emerald-500", badge: "bg-green-500" },
  { id: "deployed", title: "Deployed", color: "bg-gray-100 text-gray-700", gradient: "from-gray-500 to-slate-500", badge: "bg-gray-500" },
];

// ---------------- Sortable / Droppable ----------------

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : "auto",
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef}>{children}</div>;
}

// ---------------- Main Component ----------------

import TicketListView from "./TicketListView";

export default function KanbanBoard({ 
  projectId, 
  viewType = 'board' 
}: { 
  projectId: string;
  viewType?: 'board' | 'list';
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDescription, setNewTicketDescription] = useState("");
  const [showNewTicketForm, setShowNewTicketForm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useProjectPusher(projectId);
  const isSuperUser = useSuperUserStore((state) => state.enabled);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [newTicketAssignee, setNewTicketAssignee] = useState("");
  const [projectMembers, setProjectMembers] = useState<User[]>([]);
  const { user: currentUser } = useAuth();
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);

  const handleQuickAssign = async (ticketId: string, assigneeId: string | null) => {
    try {
      setUpdatingId(ticketId);
      const updated = await apiPatch<Ticket>("/api/tickets", {
        id: ticketId,
        assigneeId: assigneeId
      });
      
      if (updated) {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updated } : t));
        toast.success(assigneeId ? "Task assigned!" : "Task unassigned");
      }
      setAssigningTicketId(null);
    } catch (error) {
      console.error("Quick assign failed:", error);
      toast.error("Failed to assign task");
    } finally {
      setUpdatingId(null);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // ---------------- Load Tickets ----------------

  const loadTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/tickets?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        
        if (!Array.isArray(data)) {
          console.error("API did not return an array:", data);
          setTickets([]);
          return;
        }

        // Normalize backend `updates` relation into `updateHistory` the UI expects
        const normalized = data.map((t: Ticket) => ({
          ...t,
          updateHistory: Array.isArray(t.updates)
            ? t.updates.map((u: { user?: { email?: string }; timestamp?: string; updatedAt?: string; changes?: string | { status?: string } }) => ({
                email: u.user?.email || t.updatedBy || 'unknown',
                timestamp: u.timestamp || u.updatedAt || t.updatedAt,
                status: typeof u.changes === 'string' ? u.changes : (u.changes?.status || 'updated'),
              }))
            : t.updateHistory || [],
        }));
        setTickets(normalized);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to load tickets status:", res.status, errorData);
        if (res.status !== 404) {
          toast.error(errorData.error || "Failed to load tickets");
        }
        setTickets([]);
      }
    } catch (error) {
      console.error("Error loading tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchMembers = useCallback(() => {
    fetch(`/api/projects/${projectId}/members`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setProjectMembers(Array.isArray(data) ? data : []))
      .catch(() => setProjectMembers([]));
  }, [projectId]);

  useEffect(() => {
    void loadTickets();
    fetchMembers();
  }, [projectId, loadTickets, fetchMembers]);

  // ---------------- Update Status ----------------

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      setUpdatingId(ticketId);
      const updatedTicket = await apiPatch<Ticket>("/api/tickets", { 
        id: ticketId, 
        status: newStatus 
      });
      
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: newStatus,
                updateHistory: [
                  {
                    email: updatedTicket?.updatedBy || 'you',
                    timestamp: new Date().toISOString(),
                    status: newStatus,
                  },
                  ...(t.updateHistory || []),
                ],
              }
            : t
        )
      );
      
      return updatedTicket;
    } catch (error) {
      console.error("Error updating ticket status:", error);
      toast.error("Error updating ticket status");
      throw error;
    } finally {
      setUpdatingId(null);
    }
  };

  // ---------------- Drag End ----------------

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTicket = tickets.find((t) => t.id === active.id);
    if (!activeTicket) return;

    await updateTicketStatus(activeTicket.id, over.id as string);
  }

  // ---------------- Create Ticket ----------------

  async function createTicket(status: string) {
    if (!newTicketTitle.trim()) {
      toast.error("Ticket title cannot be empty");
      return;
    }

    try {
      const data = await apiPost<Ticket>("/api/tickets", {
        projectId,
        title: newTicketTitle,
        description: newTicketDescription,
        status,
        assigneeId: newTicketAssignee || null,
      });

      setNewTicketTitle("");
      setNewTicketDescription("");
      setNewTicketAssignee("");
      setShowNewTicketForm(null);

      setTickets((prev) => [
        { ...data, updateHistory: [] },
        ...prev,
      ]);

      toast.success("Ticket created successfully!");
    } catch (err) {
      console.error("Error creating ticket:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create ticket");
    }
  }

  // ---------------- Helpers ----------------

  const getTicketsByStatus = (status: string) =>
    (tickets || []).filter((t) => t.status === status);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ---------------- Render ----------------

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-background p-4 sm:p-6 lg:p-8 flex flex-col">
      {viewType === 'list' ? (
        <TicketListView 
          tickets={tickets} 
          onTicketClick={setEditingTicket} 
        />
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          {/* Header Actions */}
          <div className="max-w-[1920px] mx-auto w-full mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
               <div className="glass-morphism p-1 rounded-2xl flex items-center bg-white/20 border border-white/30">
                  <button 
                    onClick={() => setShowMembersModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 group"
                  >
                    <UsersIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest leading-none mt-0.5">Manage Team</span>
                  </button>
               </div>
            </div>
          </div>

          {/* Columns Container */}
          <div className="max-w-[1920px] mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {columns.map((column) => {
              const columnTickets = getTicketsByStatus(column.id);
              return (
                <DroppableColumn key={column.id} id={column.id}>
                  <div className="min-w-0 flex flex-col h-full glass-morphism rounded-3xl border border-white/40 shadow-xl overflow-hidden transition-all duration-300">
                    {/* Column Header */}
                    <div className={`bg-gradient-to-r ${column.gradient} p-4 pb-3 shadow-sm`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${column.badge} shadow-[0_0_8px_rgba(255,255,255,0.6)] animate-pulse`} />
                          <h2 className="text-white font-extrabold text-[11px] uppercase tracking-[0.1em]">
                            {column.title}
                          </h2>
                        </div>
                        <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border border-white/20">
                          {columnTickets.length}
                        </span>
                      </div>
                    </div>

                    {/* Tickets Area */}
                    <div className="flex-1 p-3 space-y-3 min-h-[500px]">
                      <SortableContext
                        items={columnTickets.map((t) => t.id)}
                        strategy={rectSortingStrategy}
                      >
                        <div className="space-y-3">
                          {columnTickets.map((ticket) => (
                            <SortableItem key={ticket.id} id={ticket.id}>
                              <div 
                                className="group relative bg-white hover:bg-slate-50 border border-slate-200/60 rounded-2xl p-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden ring-1 ring-inset ring-transparent hover:ring-blue-500/20"
                                onClick={() => setEditingTicket(ticket)}
                              >
                                {updatingId === ticket.id && (
                                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10 animate-in fade-in duration-200">
                                    <div className="bg-white px-3 py-1.5 rounded-full shadow-lg border border-slate-100 flex items-center space-x-2">
                                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                      <span className="text-[10px] font-bold text-slate-600">Updating</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Status Glow Overlay */}
                                <div className={`absolute left-0 top-0 w-1 h-full bg-gradient-to-b ${column.gradient} opacity-60`} />

                                {/* Metadata Row */}
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {ticket.priority && ticket.priority !== 'normal' && (
                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md flex items-center gap-1 ${
                                      ticket.priority === 'urgent' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                      ticket.priority === 'high' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                      'bg-blue-50 text-blue-600 border border-blue-100'
                                    }`}>
                                      <Flag className={`w-2.5 h-2.5 fill-current ${
                                        ticket.priority === 'urgent' ? 'text-rose-500' :
                                        ticket.priority === 'high' ? 'text-orange-500' :
                                        'text-blue-500'
                                      }`} />
                                      {ticket.priority}
                                    </span>
                                  )}
                                  
                                </div>

                                <h3 className="font-bold text-slate-800 text-[13px] leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                                  {ticket.title}
                                </h3>

                                {/* Description Snippet (Compact) */}
                                {ticket.description?.trim() && (
                                  <div className="mt-2 flex items-center space-x-1.5 opacity-60">
                                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                                    <span className="text-[10px] truncate max-w-full font-medium">Description provided</span>
                                  </div>
                                )}

                                {/* Card Footer: Due Date & Updated Time */}
                                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                                  <div className="flex flex-col gap-1">
                                    {ticket.dueDate && (
                                      <div className={`flex items-center text-[9px] font-bold ${
                                        new Date(ticket.dueDate) < new Date() 
                                          ? 'bg-rose-50 text-rose-600 border border-rose-100/50' 
                                          : 'bg-slate-50 text-slate-600 border border-slate-100/50'
                                      }`}>
                                        <svg className="w-2.5 h-2.5 mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                                        Due {new Date(ticket.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </div>
                                    )}
                                    <div className="flex items-center text-[8px] font-bold text-slate-400/80">
                                      <svg className="w-2.5 h-2.5 mr-1 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {formatDate(ticket.updatedAt)}
                                    </div>
                                  </div>

                                  {/* Assignee / Created By Display */}
                                  <div className="flex items-center gap-1.5">
                                    {ticket.assignee ? (
                                      <button 
                                        type="button"
                                        className="h-6 px-2 rounded-lg bg-blue-50 border border-blue-100 flex items-center gap-1.5 transition-all hover:border-blue-200 hover:bg-blue-100/50"
                                        title={`Assigned to ${ticket.assignee.name || ticket.assignee.email}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingTicket(ticket);
                                        }}
                                      >
                                        <div className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center text-[7px] text-white font-bold uppercase">
                                          {(ticket.assignee.name || ticket.assignee.email).charAt(0)}
                                        </div>
                                        <span className="text-[9px] font-bold text-blue-600 truncate max-w-[60px]">
                                          {(ticket.assignee.name || ticket.assignee.email).split('@')[0]}
                                        </span>
                                      </button>
                                    ) : (
                                      <div className="relative">
                                        <button 
                                          type="button"
                                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer border ${
                                            assigningTicketId === ticket.id 
                                              ? "text-blue-600 bg-blue-50 border-blue-200" 
                                              : "text-slate-400 hover:text-blue-500 hover:bg-blue-50 border-transparent hover:border-blue-100"
                                          } z-10`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setAssigningTicketId(assigningTicketId === ticket.id ? null : ticket.id);
                                          }}
                                        >
                                          <UserPlus className="w-2.5 h-2.5" />
                                          <span>Assign</span>
                                        </button>

                                        {assigningTicketId === ticket.id && (
                                          <>
                                            <div 
                                              className="fixed inset-0 z-20" 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setAssigningTicketId(null);
                                              }} 
                                            />
                                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150 origin-bottom-right">
                                              <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Assign To</span>
                                              </div>
                                              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleQuickAssign(ticket.id, null);
                                                  }}
                                                  className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors flex items-center gap-2 group"
                                                >
                                                  <div className="w-5 h-5 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 group-hover:border-blue-300 group-hover:text-blue-500 transition-colors">
                                                    <UserPlus className="w-3 h-3" />
                                                  </div>
                                                  <span className="font-medium text-slate-500 group-hover:text-blue-600">Unassigned</span>
                                                </button>
                                                {projectMembers.map((member) => (
                                                  <button
                                                    key={member.id}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleQuickAssign(ticket.id, member.id);
                                                    }}
                                                    className={`w-full px-3 py-2 text-left text-xs hover:bg-blue-50 transition-colors flex items-center gap-2 group ${
                                                      ticket.assigneeId === member.id ? "bg-blue-50/50" : ""
                                                    }`}
                                                  >
                                                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white font-bold uppercase transition-transform group-hover:scale-110">
                                                      {(member.name || member.email).charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                      <span className={`font-bold truncate ${ticket.assigneeId === member.id ? 'text-blue-600' : 'text-slate-700'}`}>
                                                        {member.name || member.email.split('@')[0]}
                                                      </span>
                                                      <span className="text-[9px] text-slate-400 truncate leading-none">{member.email}</span>
                                                    </div>
                                                  </button>
                                                ))}
                                                {projectMembers.length <= 1 && (
                                                  <div className="px-3 py-3 text-center">
                                                    <p className="text-[9px] text-slate-400 font-medium leading-tight">No other members yet. Invite team via "Manage Team".</p>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </SortableItem>
                          ))}
                        </div>
                      </SortableContext>

                      {/* New Ticket Form / Button */}
                      <div className="pt-2">
                        {showNewTicketForm === column.id ? (
                          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200">
                            <input
                              type="text"
                              value={newTicketTitle}
                              onChange={(e) => setNewTicketTitle(e.target.value)}
                              placeholder="Task title"
                              className="w-full px-3 py-2.5 mb-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-medium placeholder:text-slate-400"
                              autoFocus
                            />
                            <div className="max-h-40 overflow-y-auto mb-3 custom-scrollbar">
                              <RichTextEditor
                                value={newTicketDescription}
                                onChange={setNewTicketDescription}
                              />
                            </div>

                            {/* New Task Assignee Selection */}
                            <div className="mb-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Assign To
                              </label>
                              <select 
                                value={newTicketAssignee}
                                onChange={(e) => setNewTicketAssignee(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-slate-50/50"
                              >
                                <option value="">{projectMembers.length <= 1 ? "No members yet" : "Unassigned"}</option>
                                {projectMembers.map(member => (
                                  <option key={member.id} value={member.id}>
                                    {member.name || member.email}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setShowNewTicketForm(null);
                                  setNewTicketTitle("");
                                  setNewTicketDescription("");
                                  setNewTicketAssignee("");
                                }}
                                className="px-4 py-2 text-xs text-slate-500 font-bold hover:text-slate-700 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => createTicket(column.id)}
                                className={`px-5 py-2 text-xs text-white font-black bg-gradient-to-r ${column.gradient} rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50`}
                                disabled={!newTicketTitle.trim()}
                              >
                                Add Task
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowNewTicketForm(column.id)}
                            className="w-full group py-3 px-4 flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-300/60 hover:border-slate-400 hover:bg-white/40 transition-all duration-300 text-slate-500 hover:text-slate-700 font-bold text-xs"
                          >
                            <div className={`p-1 rounded-full bg-slate-100 group-hover:bg-slate-200 mr-2 transition-colors`}>
                              <svg className="w-3 h-3 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                            New Task
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </DroppableColumn>
              );
            })}
          </div>
        </DndContext>
      )}

      {editingTicket && (
        <EditTaskModal 
          ticket={editingTicket} 
          isCreator={currentUser?.id === editingTicket.projectCreatorId}
          onClose={() => setEditingTicket(null)} 
          onUpdate={(updated: any) => {
            if (updated._deleted) {
              setTickets(prev => prev.filter(t => t.id !== updated.id));
            } else {
              setTickets(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
            }
            setEditingTicket(null);
          }} 
        />
      )}

      {showMembersModal && (
        <ProjectMembersModal 
          projectId={projectId} 
          onClose={() => {
            setShowMembersModal(false);
            fetchMembers();
          }} 
        />
      )}
    </div>
  );
}