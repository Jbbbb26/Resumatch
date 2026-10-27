import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const siteUrl = () => (import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '');
export const jobShareUrl = (jobId) => `${siteUrl()}/jobs/${encodeURIComponent(jobId)}`;
export const companyShareUrl = (companyId) => `${siteUrl()}/companies/${encodeURIComponent(companyId)}`;
const isLocalUrl = (url) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//i.test(url);

const MENU_WIDTH = 220;

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { copied = false; }
    field.remove();
    return copied;
  }
}

const prefersNativeShare = () => typeof navigator.share === 'function'
  && window.matchMedia?.('(pointer: coarse)').matches;

const ShareIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
  </svg>
);

export function ShareButton({ url, title, text = '', label = 'Share', variant = 'button', isDarkMode = false, className = '' }) {
  const [menu, setMenu] = useState(null);
  const [status, setStatus] = useState('');
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const close = () => setMenu(null);

  useEffect(() => {
    if (!menu) return undefined;
    const onPointer = (event) => {
      if (menuRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      close();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') { close(); buttonRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    menuRef.current?.querySelector('button, a')?.focus();
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  useEffect(() => {
    if (!status) return undefined;
    const timer = setTimeout(() => setStatus(''), 2200);
    return () => clearTimeout(timer);
  }, [status]);

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (menu) return close();
    if (prefersNativeShare()) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (shareError) {
        if (shareError?.name === 'AbortError') return;
      }
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    const below = rect.bottom + 8;
    const top = below + 330 > window.innerHeight ? Math.max(8, rect.top - 338) : below;
    setMenu({ top, left });
  };

  const handleCopy = async () => {
    setStatus((await copyText(url)) ? 'copied' : 'error');
    close();
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text || title);
  const emailBody = encodeURIComponent(`${text ? `${text}\n\n` : ''}${url}`);
  const local = isLocalUrl(url);
  const links = [
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, needsPublic: true },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, needsPublic: true },
    { name: 'X (Twitter)', href: `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}` },
    { name: 'Gmail', href: `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(title)}&body=${emailBody}` },
    { name: 'Email app', href: `mailto:?subject=${encodeURIComponent(title)}&body=${emailBody}`, sameTab: true },
  ];

  const itemClass = `flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium focus:outline-none ${isDarkMode ? 'text-slate-200 hover:bg-white/10 focus:bg-white/10' : 'text-slate-700 hover:bg-slate-100 focus:bg-slate-100'}`;
  const statusText = status === 'copied' ? 'Link copied' : status === 'error' ? 'Could not copy' : '';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        aria-haspopup="menu"
        aria-expanded={Boolean(menu)}
        aria-label={variant === 'icon' ? `${label}: ${title}` : undefined}
        title={variant === 'icon' ? label : undefined}
        className={variant === 'icon'
          ? `rounded-xl p-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036] ${isDarkMode ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'} ${className}`
          : `inline-flex items-center gap-2 ${className}`}
      >
        <ShareIcon className={variant === 'icon' ? 'h-5 w-5' : 'h-4 w-4'} />
        {variant !== 'icon' && (statusText || label)}
      </button>
      {variant === 'icon' && statusText && createPortal(
        <div role="status" className="fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg">{statusText}</div>,
        document.body,
      )}
      {variant !== 'icon' && <span className="sr-only" role="status">{statusText}</span>}
      {menu && createPortal(
        <div ref={menuRef} role="menu" aria-label={`Share ${title}`}
          style={{ top: menu.top, left: menu.left, width: MENU_WIDTH }}
          className={`fixed z-[110] rounded-xl border p-1.5 shadow-xl ${isDarkMode ? 'border-white/10 bg-[#1a2636]' : 'border-slate-200 bg-white'}`}
          onClick={(event) => event.stopPropagation()}>
          <p className={`truncate px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>Share link</p>
          {local && (
            <p className={`mx-1 mb-1 rounded-lg px-2 py-1.5 text-[11px] leading-snug ${isDarkMode ? 'bg-amber-400/10 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
              This is a localhost link, so it only opens on this computer. Set VITE_PUBLIC_SITE_URL to your live site.
            </p>
          )}
          <button type="button" role="menuitem" onClick={handleCopy} className={itemClass}>Copy link</button>
          {links.filter((link) => !(local && link.needsPublic)).map((link) => (
            <a key={link.name} role="menuitem" href={link.href} onClick={close}
              target={link.sameTab ? undefined : '_blank'} rel="noopener noreferrer" className={itemClass}>
              {link.name}
            </a>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
