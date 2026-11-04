import { useCallback, useEffect, useState } from 'react';
import { listNotifications, markAllNotificationsRead, markNotificationRead, subscribeToNewNotifications } from '../data/services/notificationService';

const PAGE_SIZE = 20;

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    const { data, error: loadError } = await listNotifications(userId, PAGE_SIZE);
    if (loadError) {
      console.error('Notifications load error:', loadError.message);
      setError(loadError.message);
    } else {
      setError('');
      setNotifications(data || []);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return undefined;
    }
    load();
    return subscribeToNewNotifications(userId, (payload) => {
      setNotifications((current) => [payload.new, ...current.filter((item) => item.id !== payload.new.id)].slice(0, PAGE_SIZE));
    });
  }, [load, userId]);

  const markRead = useCallback(async (id) => {
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => (item.id === id && !item.read_at ? { ...item, read_at: readAt } : item)));
    const { error: updateError } = await markNotificationRead(id, readAt);
    if (updateError) console.error('Could not mark notification read:', updateError.message);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => (item.read_at ? item : { ...item, read_at: readAt })));
    const { error: updateError } = await markAllNotificationsRead(userId, readAt);
    if (updateError) console.error('Could not mark notifications read:', updateError.message);
  }, [userId]);

  const unreadCount = notifications.filter((item) => !item.read_at).length;
  return { notifications, unreadCount, isLoading, error, markRead, markAllRead, reload: load };
}
