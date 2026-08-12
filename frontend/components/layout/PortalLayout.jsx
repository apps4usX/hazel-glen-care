// Lightweight shell for the staff & client portals.
import { useAuth } from '../../lib/auth';
import Button from '../ui/Button';
import NotificationsBell from '../NotificationsBell';

export default function PortalLayout({ title, subtitle, children }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#F5EEE2]/60" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="bg-[#14293D] text-white">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Hazel Glen Care" className="h-10 w-10 rounded-full bg-[#F5EEE2] p-0.5" />
            <div>
              <div className="font-bold leading-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Hazel Glen Care</div>
              <div className="text-[10px] tracking-widest text-[#3E9C8E]">{subtitle || 'PORTAL'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationsBell tone="dark" />
            <span className="text-sm text-[#c3d1dc] hidden sm:block">{user?.email}</span>
            <Button variant="ghost" className="!text-white hover:!bg-white/10" onClick={logout}>Sign out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-8">
        <h1 className="text-2xl font-bold text-[#1F3D5C] mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</h1>
        {children}
      </main>
    </div>
  );
}
