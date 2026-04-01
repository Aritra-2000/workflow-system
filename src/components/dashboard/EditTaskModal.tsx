import { useState, useEffect } from "react";
import { X, Calendar, User as UserIcon, Flag, CheckSquare, Plus, Trash2, Clock, CheckCircle, ShieldAlert } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import { toast } from "react-hot-toast";
import { useSuperUserStore } from "@/store/useSuperUserStore";
import { apiPatch, apiPost } from "@/lib/api-client";

type User = { id: string; email: string; name: string | null; image: string | null };
type ChecklistItem = { id: string; title: string; completed: boolean };

export default function EditTaskModal({ 
  ticket, 
  isCreator,
  onClose, 
  onUpdate 
}: { 
  ticket: any; 
  isCreator?: boolean;
  onClose: () => void;
  onUpdate: (updatedTicket: any) => void;
}) {
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description || "");
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority || "normal");
  const [dueDate, setDueDate] = useState<string>(ticket.dueDate ? new Date(ticket.dueDate).toISOString().split('T')[0] : "");
  const [assigneeId, setAssigneeId] = useState<string>(ticket.assigneeId || "");
  
  // Safely parse checklists from DB
  const initialChecklists = typeof ticket.checklists === 'string' 
    ? JSON.parse(ticket.checklists) 
    : (Array.isArray(ticket.checklists) ? ticket.checklists : []);
  
  const [checklists, setChecklists] = useState<ChecklistItem[]>(initialChecklists);
  const [users, setUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { enabled: isSuperUser, pass: superUserPass } = useSuperUserStore();

  useEffect(() => {
    if (ticket.projectId) {
      fetch(`/api/projects/${ticket.projectId}/members`, {
        headers: {
          "x-superuser-pass": superUserPass || "",
        }
      })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("Failed to fetch members:", errorData.error || res.statusText);
          return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      })
      .then(data => setUsers(data))
      .catch((err) => {
        console.error("Fetch error:", err);
        setUsers([]);
      });
    }
  }, [ticket.projectId, superUserPass]);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch("/api/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ticket.id,
          title,
          description,
          status,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          assigneeId: assigneeId || null,
          checklists
        })
      });

      if (!res.ok) throw new Error("Failed to update ticket");
      
      const updatedTicket = await res.json();
      toast.success("Task updated");
      onUpdate(updatedTicket);
    } catch (error) {
      console.error(error);
      toast.error("Error saving task");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this task? This action cannot be undone.")) return;
    
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "DELETE",
        headers: {
          "x-superuser-pass": superUserPass || "",
        },
      });

      if (!res.ok) throw new Error("Failed to delete task");
      
      toast.success("Task deleted");
      onUpdate({ ...ticket, _deleted: true }); // Signal the parent to remove it
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Error deleting task");
    } finally {
      setIsDeleting(false);
    }
  };

  const addChecklistItem = () => {
    setChecklists([...checklists, { id: crypto.randomUUID(), title: "", completed: false }]);
  };

  const updateChecklistItem = (id: string, updates: Partial<ChecklistItem>) => {
    setChecklists(checklists.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeChecklistItem = (id: string) => {
    setChecklists(checklists.filter(item => item.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Edit Task</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Main Column */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Title */}
            <div>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task Title"
                className="w-full text-2xl font-bold text-gray-900 border-0 border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 bg-transparent px-0 py-2 transition-colors outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                Description
              </h3>
              <RichTextEditor value={description} onChange={setDescription} />
            </div>

            {/* Checklists */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-500" />
                  Subtasks
                </h3>
                <button 
                  onClick={addChecklistItem}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                >
                  + Add Item
                </button>
              </div>
              
              <div className="space-y-2">
                {checklists.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 group">
                    <input 
                      type="checkbox" 
                      checked={item.completed}
                      onChange={(e) => updateChecklistItem(item.id, { completed: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <input 
                      type="text" 
                      value={item.title}
                      onChange={(e) => updateChecklistItem(item.id, { title: e.target.value })}
                      placeholder="What needs to be done?"
                      className={`flex-1 text-sm border-0 bg-transparent focus:ring-0 px-0 focus:outline-none focus:border-b-2 focus:border-blue-500 ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
                    />
                    <button 
                      onClick={() => removeChecklistItem(item.id)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {checklists.length === 0 && (
                  <div className="text-center p-4 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500">
                    No subtasks yet.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sidebar Column */}
          <div className="w-full md:w-80 bg-slate-50 border-l border-gray-100 p-6 flex flex-col gap-6 overflow-y-auto">
            
            {/* Status */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Status</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white px-3 py-2 outline-none"
              >
                <option value="proposed">Proposed</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="deployed">Deployed</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Flag className="w-3 h-3" /> Priority
              </label>
              <select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white px-3 py-2 outline-none"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <UserIcon className="w-3 h-3" /> Assignee
              </label>
              <select 
                value={assigneeId} 
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white px-3 py-2 outline-none"
              >
                <option value="">Unassigned</option>
                {Array.isArray(users) && users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Due Date
              </label>
              <input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white px-3 py-2 outline-none"
              />
            </div>

            <div className="mt-auto pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving...</>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>

            <div className="pt-6 border-t border-rose-100">
                <button
                  onClick={() => (isSuperUser || isCreator) ? handleDelete() : toast.error("Admin authentication required")}
                  disabled={isDeleting}
                  className={`w-full py-2.5 px-4 bg-white text-xs font-black uppercase tracking-widest rounded-xl border-2 transition-all flex items-center justify-center gap-2 group ${
                    (isSuperUser || isCreator) 
                      ? "hover:bg-rose-50 text-rose-600 border-rose-100 hover:border-rose-200" 
                      : "text-slate-300 border-slate-50 cursor-not-allowed"
                  }`}
                  title={(isSuperUser || isCreator) ? "Delete Task" : "Admin required"}
                >
                  {isDeleting ? (
                    <div className="w-3 h-3 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 group-hover:shake" />
                      Delete Task
                    </>
                  )}
                </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
