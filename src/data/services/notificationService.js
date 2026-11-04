import { supabase } from '../../../supabaseClient.js';
import { subscribeToTable } from './realtimeService';

export const listNotifications = (userId, limit) => supabase
  .from('notifications')
  .select('id, type, title, body, job_id, application_id, read_at, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(limit);

export const markNotificationRead = (id, readAt) => supabase
  .from('notifications').update({ read_at: readAt }).eq('id', id).is('read_at', null);

export const markAllNotificationsRead = (userId, readAt) => supabase
  .from('notifications').update({ read_at: readAt }).eq('user_id', userId).is('read_at', null);

export const subscribeToNewNotifications = (userId, onInsert) => subscribeToTable(
  `notifications-${userId}`,
  { event: 'INSERT', table: 'notifications', filter: `user_id=eq.${userId}` },
  onInsert,
);
