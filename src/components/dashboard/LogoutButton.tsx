"use client";
import { useAuth } from '@/hooks/useAuth';

export default function LogoutButton({ isCollapsed }: { isCollapsed?: boolean }) {
  const { logout } = useAuth();

  return (
    <button
      onClick={logout}
      className={`group relative rounded-xl border-2 border-gray-200 bg-white hover:border-red-400 hover:bg-red-50 transition-all duration-200 font-medium text-gray-700 hover:text-red-600 shadow-sm hover:shadow-md flex items-center gap-2 ${
        isCollapsed ? 'justify-center w-10 h-10 p-0 border-none bg-transparent hover:bg-red-50 shadow-none' : 'px-4 py-2 w-full'
      }`}
      title={isCollapsed ? "Logout" : undefined}
    >
      <svg 
        className="w-4 h-4 group-hover:rotate-12 transition-transform" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
        />
      </svg>
      {!isCollapsed && <span>Logout</span>}
    </button>
  );
}
