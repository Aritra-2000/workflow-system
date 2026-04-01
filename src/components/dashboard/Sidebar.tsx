"use client";
import { useState, useEffect } from 'react';
import { ChevronDown, Trash2, FolderOpen, Layers, Plus, ShieldCheck, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSuperUserStore } from '@/store/useSuperUserStore';
import SuperUserModal from './SuperUserModal';
import LogoutButton from './LogoutButton';

interface Project {
  id: string;
  name: string;
  createdAt: string;
}

interface SidebarProps {
  selectedProject: string | null;
  onProjectSelect: (projectId: string) => void;
  refreshTrigger?: number; 
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ selectedProject, onProjectSelect, refreshTrigger, isCollapsed, onToggle }: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showTeam, setShowTeam] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const { enabled: isSuperUser, disable: disableSuperUser, pass: superUserPass } = useSuperUserStore();

  useEffect(() => {
    // Load projects from API
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          onProjectSelect(data[0].id);
        }
      })
      .catch(() => setProjects([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  async function createProject() {
    if (!newProjectName.trim() || creatingProject) return;
    
    try {
      setCreatingProject(true);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName })
      });
      
      if (res.ok) {
        const project = await res.json();
        setProjects(prev => [project, ...prev]);
        onProjectSelect(project.id);
        setNewProjectName('');
        setShowNewProjectForm(false);
        toast.success('Project created!');
      } else {
        toast.error('Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Error creating project');
    } finally {
      setCreatingProject(false);
    }
  }

  const handleDelete = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Show confirmation toast
    const userConfirmed = await new Promise((resolve) => {
      toast.custom((t) => (
        <div className="bg-white rounded-lg shadow-2xl p-4 w-96 border border-gray-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Delete Project</h3>
              <p className="text-sm text-gray-600 mt-1">
                Are you sure you want to delete <strong>&quot;{project.name}&quot;</strong>? This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ), {
        duration: 10000,
        position: 'top-center',
      });
    });

    if (!userConfirmed) return;

    setDeletingId(project.id);
    
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: {
          'x-superuser-pass': superUserPass || '',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
      const updatedProjects = await fetch('/api/projects').then(res => res.json());
      setProjects(updatedProjects);
      
      toast.success('Project deleted successfully');
      
      if (selectedProject === project.id) {
        onProjectSelect('');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-slate-50 to-white border-r border-gray-200 h-screen flex flex-col shadow-sm transition-all duration-300 ease-in-out overflow-hidden`}>
      {/* Header */}
      <div className={`p-5 border-b border-gray-200 bg-white ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className="flex items-center justify-between group">
          <div 
            className={`flex items-center ${isCollapsed ? 'space-x-0' : 'space-x-3'} cursor-pointer select-none active:scale-95 transition-transform`}
            onClick={() => {
              const newCount = logoClickCount + 1;
              if (newCount >= 5) {
                setShowAdminModal(true);
                setLogoClickCount(0);
              } else {
                setLogoClickCount(newCount);
                // Reset count after 2 seconds of inactivity
                setTimeout(() => setLogoClickCount(0), 2000);
              }
            }}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-white font-bold text-base">Z</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden whitespace-nowrap transition-all duration-300 transform origin-left">
                <span className="font-bold text-gray-900 text-[15px] leading-tight uppercase tracking-widest">ZenithTask</span>
                <span className={`text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 leading-none mt-0.5 transition-colors ${
                  isSuperUser ? "text-indigo-600" : "text-slate-400"
                }`}>
                  {isSuperUser ? (
                    <ShieldCheck className="w-3 h-3" />
                  ) : (
                    <Layers className="w-3 h-3 opacity-70" />
                  )}
                  {isSuperUser ? "Admin Mode" : "User Mode"}
                </span>
              </div>
            )}
          </div>
          <button 
            onClick={onToggle}
            className={`p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all focus:outline-none ${isCollapsed ? 'mb-2' : ''}`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* Projects Section */}
        <div className="mt-2">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} w-full group mb-1 p-2.5`}>
            <button 
              onClick={() => !isCollapsed && setShowTeam(!showTeam)}
              className={`flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors ${isCollapsed ? 'justify-center' : 'flex-1 text-left'}`}
              title={isCollapsed ? "Projects" : undefined}
            >
              <Layers className={`w-4 h-4 text-gray-500 group-hover:text-purple-600 transition-colors ${isCollapsed ? 'w-5 h-5' : ''}`} />
              {!isCollapsed && <span className="font-semibold text-sm whitespace-nowrap overflow-hidden transition-all duration-300">Projects</span>}
              {!isCollapsed && <ChevronDown className={`w-4 h-4 text-gray-400 transition-all ${showTeam ? 'rotate-180' : ''}`} />}
            </button>
            {!isCollapsed && (
              <button
                onClick={() => setShowNewProjectForm(true)}
                className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-purple-600 transition-colors"
                title="New Project"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {showTeam && (
            <div className="mt-2 space-y-1">
              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <FolderOpen className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm text-center">No projects yet</p>
                  <p className="text-gray-400 text-xs text-center mt-1">
                    Create your first project to get started
                  </p>
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className={`group relative rounded-lg transition-all ${
                      selectedProject === project.id
                        ? 'bg-gradient-to-r from-purple-50 to-indigo-50 shadow-sm'
                        : 'hover:bg-white'
                    }`}
                  >
                    <div
                      onClick={() => onProjectSelect(project.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                        selectedProject === project.id
                          ? 'text-purple-700'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              selectedProject === project.id
                                ? 'bg-purple-500'
                                : 'bg-gray-300'
                            }`}
                          />
                          {!isCollapsed && <span className="truncate">{project.name}</span>}
                        </div>
                        {!isCollapsed && (
                          <button
                            onClick={(e) => handleDelete(project, e)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(project, e as unknown as React.MouseEvent);
                              }
                            }}
                            className={`p-1.5 rounded-md transition-all ${
                              isSuperUser 
                                ? "text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer" 
                                : "text-gray-200 cursor-not-allowed opacity-30"
                            } ${deletingId === project.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            title={isSuperUser ? "Delete project" : "Admin required"}
                            aria-label={`Delete project ${project.name}`}
                          >
                            {deletingId === project.id ? (
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {selectedProject === project.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-600 to-indigo-600 rounded-r-full" />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
      {/* Footer */}
        <div className={`p-4 border-t border-gray-200 bg-white space-y-2 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {isSuperUser && (
            <button 
              onClick={disableSuperUser}
              className={`flex items-center ${isCollapsed ? 'justify-center w-10 h-10 p-0' : 'space-x-3 w-full p-2.5'} text-rose-600 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-all group`}
              title={isCollapsed ? "Deactivate Admin" : undefined}
            >
              <div className={`p-1 rounded-md bg-rose-50 group-hover:bg-rose-100 transition-colors ${isCollapsed ? 'p-1.5' : ''}`}>
                <ShieldAlert className="w-4 h-4" />
              </div>
              {!isCollapsed && <span className="text-sm font-black uppercase tracking-tight">Deactivate Admin</span>}
            </button>
          )}
          <div className={`${isCollapsed ? 'w-10 h-10 flex items-center justify-center p-0' : 'w-full'}`}>
             <LogoutButton isCollapsed={isCollapsed} />
          </div>
        </div>

        {showAdminModal && (
          <SuperUserModal onClose={() => setShowAdminModal(false)} />
        )}

        {/* New Project Modal mapped from dashboard */}
        {showNewProjectForm && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => {
              setShowNewProjectForm(false);
              setNewProjectName('');
            }}
          >
            <div 
              className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md transform transition-all animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      New Project
                    </h2>
                    <p className="text-sm text-gray-500">Create a new project workspace</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNewProjectForm(false);
                    setNewProjectName('');
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Form */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter project name..."
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full px-4 py-3 pl-11 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none text-gray-800 placeholder:text-gray-400"
                      onKeyPress={(e) => e.key === 'Enter' && createProject()}
                      autoFocus
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowNewProjectForm(false);
                      setNewProjectName('');
                    }}
                    className="flex-1 px-5 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-medium border-2 border-transparent hover:border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createProject}
                    disabled={!newProjectName.trim() || creatingProject}
                    className="flex-1 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2 group"
                  >
                    {creatingProject ? (
                      <>
                        <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Create Project
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Keyboard Hint */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
                <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-200 font-mono">Enter</kbd>
                <span>to create</span>
                <span className="mx-1">•</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-200 font-mono">Esc</kbd>
                <span>to cancel</span>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translate(-50%, -12px);
            }
            to {
              opacity: 1;
              transform: translate(-50%, 0);
            }
          }
          .animate-slideDown {
            animation: slideDown 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
        `}</style>
      </div>
  );
}