import { useState, useEffect, useCallback } from 'react';
import { X, UserPlus, Mail, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSuperUserStore } from '@/store/useSuperUserStore';
import Image from 'next/image';

interface Member {
  memberId: string;
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
}

interface ProjectMembersModalProps {
  projectId: string;
  onClose: () => void;
}

export default function ProjectMembersModal({ projectId, onClose }: ProjectMembersModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole] = useState('MEMBER');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const { pass: superUserPass } = useSuperUserStore();

  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/projects/${projectId}/members`, {
        headers: {
          'x-superuser-pass': superUserPass || '',
        }
      });
      if (!res.ok) throw new Error('Failed to fetch members');
      const data = await res.json();
      setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, superUserPass]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  async function addMember() {
    if (!newMemberEmail.trim()) return;
    try {
      setIsAdding(true);
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-superuser-pass': superUserPass || '',
        },
        body: JSON.stringify({ email: newMemberEmail, role: newMemberRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member');
      
      setMembers(prev => [...prev, data]);
      setNewMemberEmail('');
      toast.success('Member added successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error adding member');
    } finally {
      setIsAdding(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'x-superuser-pass': superUserPass || '',
        },
      });
      if (!res.ok) throw new Error('Failed to remove member');
      
      setMembers(prev => prev.filter(m => m.memberId !== memberId));
      toast.success('Member removed');
    } catch (err) {
      toast.error('Error removing member');
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Project Team</h2>
                <p className="text-xs text-slate-500 font-medium tracking-wide flex items-center gap-1">
                  <Shield className="w-3 h-3 text-indigo-400" />
                  Manage who can access this project
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Add Member Form */}
        <div className="p-8 border-b border-slate-100 bg-white">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">
                Add Member by Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500/20 focus:ring-4 focus:ring-indigo-100/50 transition-all outline-none text-sm font-medium"
                />
              </div>
            </div>
            <button
              onClick={addMember}
              disabled={isAdding || !newMemberEmail}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/50 transition-all transform active:scale-95 flex-shrink-0 mb-[2px]"
            >
              {isAdding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto max-h-[400px] p-8 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
               <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Team</span>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 px-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
               <UserIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
               <p className="text-sm font-bold text-slate-500">No members yet</p>
               <p className="text-xs text-slate-400 mt-1">Start by adding your first project member!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {members.map((member) => {
                const initials = member.name ? member.name.charAt(0) : member.email.charAt(0);
                return (
                  <div 
                    key={member.memberId}
                    className="group flex items-center justify-between p-3.5 bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50"
                  >
                    <div className="flex items-center space-x-4">
                      {member.image ? (
                        <Image 
                          src={member.image} 
                          alt={member.email} 
                          width={44} 
                          height={44} 
                          className="w-11 h-11 rounded-2xl object-cover shadow-sm ring-2 ring-white" 
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm uppercase shadow-md shadow-indigo-200/40 ring-2 ring-white">
                          {initials}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-black text-slate-800 leading-none mb-1 capitalize">
                          {member.name || member.email.split('@')[0]}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                       <span className="px-2 py-0.5 bg-white text-[8px] font-black uppercase text-indigo-600 rounded-lg border border-indigo-100 shadow-sm">
                         {member.role}
                       </span>
                       <button
                         onClick={() => removeMember(member.memberId)}
                         className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                         title="Remove Member"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/30 text-[9px] font-bold text-slate-300 flex items-center justify-between uppercase tracking-[0.1em]">
          <span>Total {members.length} Members</span>
          <span className="text-indigo-400">Next-Gen Project Management</span>
        </div>
      </div>
    </div>
  );
}
