import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient.js';

// Fired after messages are read or sent so badges and lists refresh everywhere.
export const MESSAGES_CHANGED_EVENT = 'resumatch:messages-changed';
const announce = () => window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));
export const MAX_MESSAGE_LENGTH = 2000;

let channelSeq = 0;
const channelName = (prefix) => `${prefix}-${Date.now()}-${(channelSeq += 1)}`;

/** Live count of unread messages for the header badge. */
export function useUnreadMessageCount(userId) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.rpc('unread_message_count');
    if (!error) setCount(Number(data) || 0);
  }, [userId]);

  useEffect(() => {
    if (!userId) { setCount(0); return undefined; }
    refresh();
    const channel = supabase
      .channel(channelName(`unread-${userId}`))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` }, refresh)
      .subscribe();
    window.addEventListener(MESSAGES_CHANGED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(MESSAGES_CHANGED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh, userId]);

  return count;
}

/** The signed-in user's conversations (newest first), kept up to date. */
export function useConversations(userId) {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error: loadError } = await supabase.rpc('list_conversations');
    if (loadError) setError(loadError.message);
    else { setError(''); setConversations(data || []); }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    refresh();
    const channel = supabase
      .channel(channelName(`conversations-${userId}`))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refresh)
      .subscribe();
    window.addEventListener(MESSAGES_CHANGED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(MESSAGES_CHANGED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh, userId]);

  return { conversations, isLoading, error, refresh };
}

/** Header info for one conversation, even before its first message. */
export async function fetchConversation(applicationId) {
  const { data, error } = await supabase.rpc('list_conversations', { p_application_id: applicationId });
  if (error) throw error;
  return (data || [])[0] || null;
}

/** Messages in one conversation, live, with send and auto mark-as-read. */
export function useThread(applicationId, userId) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const activeId = useRef(applicationId);

  const markRead = useCallback(async () => {
    if (!applicationId) return;
    const { data } = await supabase.rpc('mark_conversation_read', { p_application_id: applicationId });
    if (Number(data) > 0) announce();
  }, [applicationId]);

  useEffect(() => {
    activeId.current = applicationId;
    setMessages([]);
    setError('');
    if (!applicationId || !userId) { setIsLoading(false); return undefined; }
    setIsLoading(true);
    let cancelled = false;

    supabase.from('messages')
      .select('id, application_id, sender_id, recipient_id, body, created_at, read_at')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error: loadError }) => {
        if (cancelled) return;
        if (loadError) setError(loadError.message);
        else setMessages((current) => {
          const byId = new Map([...(data || []).reverse(), ...current].map((item) => [item.id, item]));
          return [...byId.values()].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });
        setIsLoading(false);
        markRead();
      });

    const channel = supabase
      .channel(channelName(`thread-${applicationId}`))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `application_id=eq.${applicationId}` }, (payload) => {
        if (activeId.current !== applicationId) return;
        setMessages((current) => (current.some((item) => item.id === payload.new.id) ? current : [...current, payload.new]));
        if (payload.new.recipient_id === userId) markRead();
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [applicationId, userId, markRead]);

  const send = useCallback(async (text) => {
    const body = String(text || '').trim();
    if (!body || !applicationId) return false;
    if (body.length > MAX_MESSAGE_LENGTH) { setError(`Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`); return false; }
    setIsSending(true);
    setError('');
    const { data, error: sendError } = await supabase.from('messages')
      .insert({ application_id: applicationId, sender_id: userId, recipient_id: userId, body }) // recipient is set by the database
      .select('id, application_id, sender_id, recipient_id, body, created_at, read_at')
      .single();
    setIsSending(false);
    if (sendError) { setError(sendError.message || 'Message not sent.'); return false; }
    setMessages((current) => (current.some((item) => item.id === data.id) ? current : [...current, data]));
    announce();
    return true;
  }, [applicationId, userId]);

  return { messages, isLoading, error, isSending, send };
}
