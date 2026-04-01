"use client";
import { useEffect, useState } from 'react';

type ActiveUser = { id: string; email: string | null; name: string | null; updatedAt: string };

export default function ActiveUsersBadge() {
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users/active');
        if (res.ok) setUsers(await res.json());
      } catch {}
    };
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const count = users.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`
          group relative flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-medium
          transition-all duration-200 ease-out
          ${count > 0 
            ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 hover:border-emerald-300 hover:shadow-sm' 
            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-100'
          }
        `}
      >
        <span className="relative flex items-center justify-center">
          <span className={`
            inline-block w-2 h-2 rounded-full
            ${count > 0 ? 'bg-emerald-500' : 'bg-gray-400'}
          `}/>
          {count > 0 && (
            <span className="absolute inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75"/>
          )}
        </span>
        <span>Active Users</span>
        <span className={`
          min-w-[1.5rem] h-6 flex items-center justify-center px-2 rounded-md text-xs font-semibold
          ${count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}
        `}>
          {count}
        </span>
      </button>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Active Users</h3>
              <p className="text-xs text-gray-500 mt-0.5">{count} {count === 1 ? 'user' : 'users'} online now</p>
            </div>
            
            <div className="max-h-72 overflow-y-auto">
              {users.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {users.map(u => (
                    <div 
                      key={u.id} 
                      className="px-4 py-3 hover:bg-gray-50 transition-colors duration-150"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                            {(u.name || u.email || 'U')[0].toUpperCase()}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"/>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {u.name || (u.email?.split('@')[0]) || 'Anonymous User'}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {u.email || 'No email'}
                          </p>
                        </div>
                        
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs font-medium text-gray-600">
                            {new Date(u.updatedAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">No active users</p>
                  <p className="text-xs text-gray-500 mt-1">Check back later</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}