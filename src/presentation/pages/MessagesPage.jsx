import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../../data/services/authService';
import { TopHeader } from '../components/TopHeader';
import { MAX_MESSAGE_LENGTH, fetchConversation, useConversations, useThread } from '../../hooks/useMessages';

const isDarkDefault = () => !document.documentElement.classList.contains('light-mode');

const timeLabel = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const days = (now - date) / 86400000;
  if (days < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
const dayLabel = (iso) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};
const initialsOf = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '?';
const statusLabel = (status) => (status === 'Rejected' ? 'Not selected' : status || 'Applied');

function ConversationList({ conversations, selectedId, onSelect, isLoading, error, isDarkMode, role }) {
  const [query, setQuery] = useState('');
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const visible = conversations.filter((item) => `${item.other_name} ${item.job_title}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="flex min-h-0 flex-col">
      <div className={`border-b p-4 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
        <h1 className={`mb-3 font-serif text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Messages</h1>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" aria-label="Search conversations"
          className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#ea6036] ${isDarkMode ? 'border-white/10 bg-[#0a121c] text-white' : 'border-slate-300 bg-white text-slate-900'}`} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? <p className="p-4 text-sm text-red-500">Couldn't load conversations: {error}</p>
          : isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className={`h-16 animate-pulse rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />)}</div>
          : visible.length === 0 ? (
            <p className={`p-6 text-center text-sm ${muted}`}>
              {conversations.length ? 'No conversations match your search.'
                : role === 'recruiter'
                  ? 'No messages yet. Open an applicant from your Pipeline or applications list and choose "Message".'
                  : 'No messages yet. Open one of your applications and choose "Message recruiter".'}
            </p>
          ) : (
            <ul>
              {visible.map((item) => {
                const active = item.application_id === selectedId;
                const unread = item.unread_count > 0;
                return (
                  <li key={item.application_id}>
                    <button type="button" onClick={() => onSelect(item.application_id)} aria-current={active ? 'true' : undefined}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${active ? (isDarkMode ? 'bg-[#ea6036]/10' : 'bg-orange-50') : (isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50')}`}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ea6036] text-xs font-bold text-white">{initialsOf(item.other_name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-sm ${unread ? 'font-bold' : 'font-semibold'} ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.other_name}</span>
                          <span className={`shrink-0 text-[11px] ${unread ? 'font-bold text-[#ea6036]' : muted}`}>{timeLabel(item.last_message_at)}</span>
                        </span>
                        <span className={`block truncate text-xs ${muted}`}>{item.job_title}</span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span className={`min-w-0 flex-1 truncate text-xs ${unread ? (isDarkMode ? 'font-semibold text-slate-100' : 'font-semibold text-slate-800') : muted}`}>
                            {item.last_message || 'No messages yet'}
                          </span>
                          {unread && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ea6036] px-1.5 text-[10px] font-bold text-white">{item.unread_count}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
      </div>
    </div>
  );
}

function Thread({ conversation, userId, isDarkMode, onBack }) {
  const { messages, isLoading, error, isSending, send } = useThread(conversation?.application_id, userId);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length, conversation?.application_id]);
  useEffect(() => { setDraft(''); inputRef.current?.focus(); }, [conversation?.application_id]);

  const submit = async (event) => {
    event?.preventDefault();
    if (!draft.trim() || isSending) return;
    const ok = await send(draft);
    if (ok) setDraft('');
    inputRef.current?.focus();
  };

  const applicationLink = conversation.my_role === 'candidate'
    ? `/candidate-dashboard?application=${conversation.application_id}`
    : '/recruiter-dashboard';

  return (
    <div className="flex min-h-0 flex-col">
      <header className={`flex items-center gap-3 border-b px-4 py-3 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
        <button type="button" onClick={onBack} aria-label="Back to conversations" className={`rounded-lg p-1.5 md:hidden ${isDarkMode ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ea6036] text-xs font-bold text-white">{initialsOf(conversation.other_name)}</span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{conversation.other_name}</p>
          <p className={`truncate text-xs ${muted}`}>
            {conversation.job_title} · <span className="font-semibold">{statusLabel(conversation.application_status)}</span>
          </p>
        </div>
        <Link to={applicationLink} className="shrink-0 text-xs font-bold text-[#ea6036] hover:underline">
          {conversation.my_role === 'candidate' ? 'View application' : 'Open pipeline'}
        </Link>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite">
        {isLoading ? <p className={`text-center text-sm ${muted}`}>Loading messages…</p>
          : messages.length === 0 ? (
            <p className={`mx-auto mt-10 max-w-sm text-center text-sm ${muted}`}>
              Start the conversation about <strong>{conversation.job_title}</strong>. {conversation.my_role === 'candidate' ? 'The recruiter' : 'The candidate'} will see your message in their Messages.
            </p>
          ) : messages.map((message, index) => {
            const mine = message.sender_id === userId;
            const showDay = index === 0 || new Date(messages[index - 1].created_at).toDateString() !== new Date(message.created_at).toDateString();
            return (
              <div key={message.id}>
                {showDay && <p className={`my-3 text-center text-[11px] font-semibold uppercase tracking-wide ${muted}`}>{dayLabel(message.created_at)}</p>}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${mine
                    ? 'rounded-br-md bg-[#ea6036] text-white'
                    : (isDarkMode ? 'rounded-bl-md bg-[#1a2636] text-slate-100' : 'rounded-bl-md bg-slate-100 text-slate-800')}`}>
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <p className={`mt-1 text-right text-[10px] ${mine ? 'text-white/75' : muted}`}>
                      {new Date(message.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className={`border-t p-3 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
        {error && <p role="alert" className="mb-2 text-xs text-red-500">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) submit(event); }}
            rows={Math.min(5, Math.max(1, draft.split('\n').length))}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Write a message…"
            aria-label="Message"
            className={`max-h-40 min-h-[42px] flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-[#ea6036] ${isDarkMode ? 'border-white/10 bg-[#0a121c] text-white' : 'border-slate-300 bg-white text-slate-900'}`}
          />
          <button type="submit" disabled={!draft.trim() || isSending}
            className="h-[42px] shrink-0 rounded-xl bg-[#ea6036] px-4 text-sm font-bold text-white hover:bg-[#d8552e] disabled:cursor-not-allowed disabled:opacity-50">
            {isSending ? 'Sending…' : 'Send'}
          </button>
        </div>
        <p className={`mt-1 text-[11px] ${muted}`}>
          Enter to send · Shift+Enter for a new line{draft.length > MAX_MESSAGE_LENGTH - 200 ? ` · ${MAX_MESSAGE_LENGTH - draft.length} characters left` : ''}
        </p>
      </form>
    </div>
  );
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('application');
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(isDarkDefault);
  const [extraConversation, setExtraConversation] = useState(null);
  const [selectError, setSelectError] = useState('');
  const { conversations, isLoading, error } = useConversations(user?.id);

  useEffect(() => { document.documentElement.classList.toggle('light-mode', !isDarkMode); }, [isDarkMode]);

  useEffect(() => {
    document.title = 'Messages | ResuMatch';
    getCurrentUser().then((response) => {
      if (!response.success || !response.data) { navigate('/login', { replace: true }); return; }
      const meta = response.data.user_metadata || {};
      const name = (meta.full_name || meta.name || response.data.email?.split('@')[0] || 'User').trim();
      const parts = name.split(/\s+/);
      setUser({
        id: response.data.id,
        name,
        email: response.data.email,
        role: meta.role,
        initials: (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase(),
      });
    });
  }, [navigate]);

  const selected = useMemo(() => conversations.find((item) => item.application_id === selectedId)
    || (extraConversation?.application_id === selectedId ? extraConversation : null), [conversations, extraConversation, selectedId]);

  // A conversation opened from an application may have no messages yet.
  useEffect(() => {
    if (!user?.id || !selectedId || isLoading) return;
    if (conversations.some((item) => item.application_id === selectedId)) return;
    if (extraConversation?.application_id === selectedId) return;
    setSelectError('');
    fetchConversation(selectedId)
      .then((conversation) => {
        if (conversation) setExtraConversation(conversation);
        else setSelectError('This conversation is not available.');
      })
      .catch((err) => setSelectError(err.message || 'This conversation is not available.'));
  }, [conversations, extraConversation, isLoading, selectedId, user?.id]);

  const dashboard = user?.role === 'recruiter' ? '/recruiter-dashboard' : '/candidate-dashboard';
  const select = (applicationId) => setSearchParams(applicationId ? { application: applicationId } : {});

  if (!user) {
    return <div role="status" className={`flex min-h-screen items-center justify-center text-sm ${isDarkMode ? 'bg-[#090e15] text-slate-300' : 'bg-slate-50 text-slate-500'}`}>Loading messages…</div>;
  }

  return (
    <div className={`flex h-screen flex-col ${isDarkMode ? 'bg-[#090e15] text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
      <TopHeader
        user={user}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode((value) => !value)}
        openProfile={() => navigate(dashboard)}
        logout={async () => { const result = await logoutUser(); if (result.success) navigate('/login'); }}
        onHome={() => navigate(dashboard)}
        onNotificationSelect={(notification) => navigate(user.role === 'recruiter' || !notification?.application_id
          ? dashboard : `/candidate-dashboard?application=${notification.application_id}`)}
      />
      <main className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 p-0 sm:p-4">
        <div className={`grid min-h-0 w-full overflow-hidden border sm:rounded-2xl md:grid-cols-[320px_minmax(0,1fr)] ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-white shadow-sm'}`}>
          <aside className={`min-h-0 md:flex md:flex-col md:border-r ${selectedId ? 'hidden' : 'flex flex-col'} ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
            <ConversationList conversations={conversations} selectedId={selectedId} onSelect={select} isLoading={isLoading} error={error} isDarkMode={isDarkMode} role={user.role} />
          </aside>
          <section className={`min-h-0 flex-col ${selectedId ? 'flex' : 'hidden md:flex'}`}>
            {selected ? (
              <Thread conversation={selected} userId={user.id} isDarkMode={isDarkMode} onBack={() => select(null)} />
            ) : selectedId && selectError ? (
              <div className="m-auto max-w-sm p-6 text-center text-sm">
                <p className="text-red-500">{selectError}</p>
                <button type="button" onClick={() => select(null)} className="mt-3 font-semibold text-[#ea6036] hover:underline">Back to conversations</button>
              </div>
            ) : selectedId ? (
              <p className={`m-auto text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading conversation…</p>
            ) : (
              <div className={`m-auto max-w-xs p-6 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <svg className="mx-auto mb-3 h-10 w-10 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h8M8 14h5m-9 6l3.2-2.4A2 2 0 018.4 17H19a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14z" /></svg>
                Choose a conversation to read and reply.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
