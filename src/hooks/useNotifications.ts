import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { pusherClient } from '@/lib/pusher';
import { apiGet, apiPost } from '@/lib/api-client';

interface Notification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export function useNotifications(projectId: string) {
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchUnreadCount = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const count = await apiGet<number>(`/api/notifications/unread/count?projectId=${projectId}`);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [projectId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentEmail(localStorage.getItem('userEmail'));
    }
  }, []);

  useEffect(() => {
    if (!projectId) return;

    // Initial fetch of unread count
    fetchUnreadCount();

    // Initialize Pusher channel for real-time updates
    const channel = pusherClient.subscribe(`project-${projectId}`);

    const handleTicketUpdated = (data: { 
      id?: string; 
      ticketId?: string; 
      updatedBy?: string; 
      actorName?: string; 
      ticketTitle?: string; 
      status?: string;
      changedFields?: string[];
    }) => {
      if (data.updatedBy && currentEmail && data.updatedBy === currentEmail) return; // Don't notify self
      
      const actor = data.actorName || data.updatedBy?.split('@')[0] || 'someone';
      const title = data.ticketTitle || 'a task';
      
      let actionText = 'updated';
      if (Array.isArray(data.changedFields) && data.changedFields.length > 0) {
        if (data.changedFields.includes('status')) {
          actionText = `moved "${title}" to ${data.status?.replace('_', ' ')}`;
        } else if (data.changedFields.length === 1) {
          actionText = `updated the ${data.changedFields[0]} of "${title}"`;
        } else {
          actionText = `updated multiple fields of "${title}"`;
        }
      } else if (data.status) {
        actionText = `moved "${title}" to ${data.status.replace('_', ' ')}`;
      } else {
        actionText = `updated "${title}"`;
      }
      
      const notification: Notification = {
        id: Date.now().toString(),
        message: `${actor} ${actionText}`,
        timestamp: new Date().toISOString(),
        read: false
      };

      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification with unique ID to ensure a fresh toast for every update
      toast(notification.message, {
        id: `ticket-upd-${notification.id}`,
        position: 'top-right',
        duration: 4000,
      });
    };

    // Backend emits 'ticket:updated' for project-specific updates
    channel.bind('ticket:updated', handleTicketUpdated);

    // Cleanup
    return () => {
      channel.unbind('ticket:updated', handleTicketUpdated);
      pusherClient.unsubscribe(`project-${projectId}`);
    };
  }, [projectId, currentEmail, fetchUnreadCount]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiPost(`/api/notifications/read`, { id });
      
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id 
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiPost(`/api/notifications/read-all`, { projectId });
      
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          read: true
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  }, [projectId]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
}
