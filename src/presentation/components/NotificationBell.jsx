import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';

const timeAgo = (value) => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const TYPE_STYLE = {
  new_applicant: { color: 'bg-[#3c8eec]', path: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
  reapplied: { color: 'bg-[#8b5cf6]', path: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  status_changed: { color: 'bg-[#4fa784]', path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
};

export function NotificationBell({ userId, isDarkMode, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const { notifications, unreadCount, isLoading, error, markRead, markAllRead } = useNotifications(userId);

  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (event) => { if (ref.current && !ref.current.contains(event.target)) setIsOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const handleSelect = (notification) => {
    if (!notification.read_at) markRead(notification.id);
    setIsOpen(false);
    onSelect?.(notification);
  };

  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="relative flex items-center" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
        className={`relative flex items-center transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}`}
      >
        <svg className="block w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
        {unreadCount > 0 && (
          <span className={`absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ea6036] px-1 text-[9px] font-bold leading-none text-white ring-2 ${isDarkMode ? 'ring-[#090e15]' : 'ring-white'}`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute right-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border shadow-2xl ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-white'}`}>
          <div className={`flex items-center justify-between border-b px-4 py-3 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
            <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-semibold text-[#ea6036] hover:underline">Mark all as read</button>
            )}
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {error ? (
              <p className={`px-4 py-6 text-center text-xs ${muted}`}>Could not load notifications: {error}</p>
            ) : isLoading && !notifications.length ? (
              <p className={`px-4 py-6 text-center text-xs ${muted}`}>Loading…</p>
            ) : !notifications.length ? (
              <p className={`px-4 py-8 text-center text-xs ${muted}`}>You're all caught up. New updates will appear here.</p>
            ) : (
              <ul>
                {notifications.map((notification) => {
                  const style = TYPE_STYLE[notification.type] || TYPE_STYLE.status_changed;
                  const unread = !notification.read_at;
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(notification)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${unread ? (isDarkMode ? 'bg-[#ea6036]/[0.06]' : 'bg-orange-50/60') : ''} ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                      >
                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${style.color}`} aria-hidden="true">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={style.path} /></svg>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm leading-snug ${unread ? 'font-bold' : 'font-medium'} ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{notification.title}</span>
                          {notification.body && <span className={`mt-0.5 block text-xs leading-relaxed ${muted}`}>{notification.body}</span>}
                          <span className={`mt-1 block text-[11px] ${muted}`}>{timeAgo(notification.created_at)}</span>
                        </span>
                        {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#ea6036]" aria-label="Unread" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
