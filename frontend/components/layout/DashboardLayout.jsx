// Admin dashboard shell: sidebar nav + topbar with user + logout.
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import NotificationsBell from '../NotificationsBell';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/team', label: 'Team' },
  { href: '/admin/shifts', label: 'Shifts' },
  { href: '/admin/timesheets', label: 'Timesheets' },
  { href: '/admin/recruitment', label: 'Recruitment' },
  { href: '/admin/compliance', label: 'Compliance' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/finance', label: 'Finance' },
];

export default function DashboardLayout({ title, actions, children }) {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#F5EEE2]/50" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex">
        {/* sidebar */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col bg-[#14293D] text-[#c3d1dc] min-h-screen p-4">
          <div className="flex items-center gap-2 px-2 py-3 mb-4">
            <img src="/logo.png" alt="Hazel Glen Care" className="h-10 w-10 rounded-full bg-[#F5EEE2] p-0.5" />
            <div>
              <div className="text-white font-bold leading-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Hazel Glen</div>
              <div className="text-[10px] tracking-widest text-[#3E9C8E]">CARE · ADMIN</div>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => {
              const active = router.pathname === n.href;
              return (
                <Link key={n.href} href={n.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? 'bg-[#3E9C8E] text-white' : 'hover:bg-white/5'
                  }`}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <button onClick={logout} className="mt-auto rounded-lg px-3 py-2 text-sm text-left hover:bg-white/5">
            Sign out
          </button>
        </aside>

        {/* main */}
        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white/90 backdrop-blur border-b border-[#1F3D5C]/10 px-6 py-3">
            <h1 className="text-lg font-bold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</h1>
            <div className="flex items-center gap-3">
              {actions}
              <NotificationsBell />
              <div className="text-right leading-tight">
                <div className="text-sm font-semibold text-[#1F3D5C]">{user?.email}</div>
                <div className="text-[11px] text-[#61707A]">{user?.role}</div>
              </div>
            </div>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
