// Notifications bell with unread count + dropdown. Works for any signed-in user.
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export default function NotificationsBell({ tone = 'light' }) {
  const dark = tone === 'dark';
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  async function load() {
    try {
      const { notifications, unread } = await api.notifications.list();
      setItems(notifications || []);
      setUnread(unread || 0);
    } catch { /* ignore transient errors */ }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markRead(n) {
    if (n.isRead) return;
    try { await api.notifications.markRead(n.id); load(); } catch { /* ignore */ }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Notifications"
        className={`relative h-9 w-9 grid place-items-center rounded-full ${dark ? 'hover:bg-white/10' : 'hover:bg-[#1F3D5C]/5'}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={dark ? 'text-white' : 'text-[#1F3D5C]'}>
          <path d="M6 8a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" strokeLinejoin="round" />
          <path d="M10 20a2 2 0 004 0" strokeLinecap="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#C0453B] text-white text-[10px] font-bold grid place-items-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-[#1F3D5C]/10 rounded-xl shadow-xl z-50">
          <div className="px-4 py-2.5 border-b border-[#1F3D5C]/10 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Notifications
          </div>
          {items.length === 0 && <div className="px-4 py-6 text-sm text-[#61707A] text-center">You’re all caught up.</div>}
          {items.map((n) => (
            <button key={n.id} onClick={() => markRead(n)}
              className={`block w-full text-left px-4 py-3 border-b border-[#1F3D5C]/5 last:border-0 hover:bg-[#F5EEE2]/50 ${n.isRead ? '' : 'bg-[#E4F0EC]/50'}`}>
              <div className="text-sm font-semibold text-[#1F3D5C]">{n.title}</div>
              <div className="text-xs text-[#61707A] mt-0.5">{n.body}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
