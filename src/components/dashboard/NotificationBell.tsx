"use client";
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usePusher } from '@/hooks/useSocket';
import { apiGet } from '@/lib/api-client';

export default function NotificationBell({ projectId }: { projectId?: string }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { pusher } = usePusher();
  const [isAnimating, setIsAnimating] = useState(false);

  // Fetch unread count (per project if provided, else global for user)
  useEffect(() => {
    const fetchUnreadCount = async () => {
      const query = projectId ? `?projectId=${projectId}` : '';
      try {
        const count = await apiGet<number>(`/api/notifications/unread/count${query}`);
        setUnreadCount(count || 0);
      } catch (error) {
        // Fallback: compute unread count from notifications list if the endpoint is unavailable
        try {
          const activities = await apiGet<Array<{ isRead: boolean }>>(`/api/notifications${query}${query ? '&' : '?'}limit=100`);
          const count = (activities || []).filter((a) => a && a.isRead === false).length;
          setUnreadCount(count);
        } catch {
          console.error('Error fetching unread count:', error);
        }
      }
    };

    fetchUnreadCount();
    // Refresh count every 30 seconds to catch any missed real-time updates
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [projectId]);

  // Set up real-time updates
  useEffect(() => {
    if (!pusher) return;

    const globalChannel = pusher.subscribe('global');
    const handleGlobalNotification = (payload?: { type?: string; projectId?: string; message?: string }) => {
      setUnreadCount(prev => prev + 1);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
      const msg = payload?.message || (payload?.type ? `New ${payload.type.replace(':', ' ')}` : 'New notification');
      toast(msg);
    };
    globalChannel.bind('notification', handleGlobalNotification);

    // Also listen to project-specific ticket updates if projectId is present
    let projectChannel: ReturnType<typeof pusher.subscribe> | null = null;
    const handleProjectTicketUpdate = (payload?: { ticketId?: string; updatedBy?: string }) => {
      setUnreadCount(prev => prev + 1);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
      const who = payload?.updatedBy ? ` by ${payload.updatedBy.split('@')[0]}` : '';
      toast(`Ticket updated${who}`);
    };
    if (projectId) {
      projectChannel = pusher.subscribe(`project-${projectId}`);
      projectChannel.bind('ticket:updated', handleProjectTicketUpdate);
    }

    return () => {
      globalChannel.unbind('notification', handleGlobalNotification);
      pusher.unsubscribe('global');
      if (projectChannel) {
        projectChannel.unbind('ticket:updated', handleProjectTicketUpdate);
        pusher.unsubscribe(`project-${projectId}`);
      }
    };
  }, [pusher, projectId]);

  return (
    <div className="relative">
      <button
        onClick={() => window.location.href = '/notifications'}
        className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
          unreadCount > 0 
            ? 'bg-blue-50 hover:bg-blue-100 text-blue-600' 
            : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
        } ${isAnimating ? 'animate-wiggle' : ''}`}
      >
        <Bell 
          className={`w-5 h-5 transition-transform duration-200 ${
            isAnimating ? 'scale-110' : 'scale-100'
          }`}
        />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        
        {/* Pulse ring effect when there are notifications */}
        {unreadCount > 0 && (
          <span className="absolute inset-0 rounded-lg bg-blue-400 opacity-0 animate-ping-slow" />
        )}
      </button>
    </div>
  );
}