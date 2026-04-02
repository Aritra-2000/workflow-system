"use client";
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import KanbanBoard from '@/components/dashboard/KanbanBoard';
import NotificationBell from '@/components/dashboard/NotificationBell';
import ActiveUsersBadge from '@/components/dashboard/ActiveUsersBadge';
import Loading from '@/app/loading';
import { useSuperUserStore } from '@/store/useSuperUserStore';
import { ShieldCheck, User as UserIcon } from 'lucide-react';
import SuperUserModal from '@/components/dashboard/SuperUserModal';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const selectedProject = searchParams.get('project');
  const [viewType, setViewType] = useState<'board' | 'list'>('board');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { enabled: storeIsSuperUser } = useSuperUserStore();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setMounted(true), []);

  const isSuperUser = mounted ? storeIsSuperUser : false;
  const handleProjectSelect = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('project', id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        selectedProject={selectedProject}
        onProjectSelect={handleProjectSelect}
        isCollapsed={!isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-full">
            <div className="flex items-center gap-4">
              {/* Sidebar toggle is now in Sidebar.tsx */}

              {/* Access Badge (Static Status) */}
              <div
                className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl transition-all duration-300 border-2 select-none ${isSuperUser
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-100"
                    : "bg-white text-slate-400 border-slate-100"
                  }`}
              >
                {isSuperUser ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
                <span className="text-[10px] font-black uppercase tracking-widest leading-none mt-0.5">
                  {isSuperUser ? "Admin" : "User"}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4 ml-auto">
              {/* View Toggle */}
              {selectedProject && (
                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                  <button
                    onClick={() => setViewType('board')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${viewType === 'board'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    Board
                  </button>
                  <button
                    onClick={() => setViewType('list')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${viewType === 'list'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    List
                  </button>
                </div>
              )}

              <ActiveUsersBadge />
              <div className="flex-shrink-0">
                <NotificationBell projectId={selectedProject ?? undefined} />
              </div>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        {selectedProject ? (
          <KanbanBoard projectId={selectedProject} viewType={viewType} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
              <p className="text-gray-500 mb-4">Select or create a project from the sidebar</p>
            </div>
          </div>
        )}
      </div>

      {showAdminModal && (
        <SuperUserModal onClose={() => setShowAdminModal(false)} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardContent />
    </Suspense>
  );
}
