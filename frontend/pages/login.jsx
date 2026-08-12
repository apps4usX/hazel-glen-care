import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import Button from '../components/ui/Button';
import InputField from '../components/forms/InputField';
import Seo from '../components/Seo';

const DEMO = [
  { role: 'Admin', email: 'admin@hazelglencare.co.za' },
  { role: 'Staff', email: 'thandi@hazelglencare.co.za' },
  { role: 'Client', email: 'client@example.co.za' },
];

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('admin@hazelglencare.co.za');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(email, password);
      const home = { ADMIN: '/admin/dashboard', STAFF: '/staff', CLIENT: '/client' };
      router.replace(home[user.role] || '/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-[#14293D]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Seo title="Sign in · Hazel Glen Care" />

      {/* brand visual (large screens) */}
      <div className="relative hidden md:block overflow-hidden">
        <img src="/brand/glass-award.jpg" alt="Hazel Glen Care crystal emblem" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(20,41,61,.55), rgba(31,61,92,.35) 45%, rgba(62,156,142,.25))' }} />
        <div className="absolute left-10 bottom-10 text-white max-w-sm">
          <div className="text-[11px] tracking-[0.3em] uppercase text-[#bfe0d8]" style={{ fontFamily: 'Poppins, sans-serif' }}>Hazel Glen Care</div>
          <h2 className="text-3xl font-bold mt-2 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Care held with a steady hand.</h2>
          <p className="text-[#cdd8e2] mt-3 text-sm">Inclusive nursing and home care across Gauteng — one secure place for clients, staff and admin.</p>
        </div>
      </div>

      {/* sign-in card */}
      <div className="grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="Hazel Glen Care" className="mx-auto mb-3 h-16 w-16 rounded-full bg-[#F5EEE2] p-1" />
          <h1 className="text-xl font-bold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Hazel Glen Care</h1>
          <p className="text-sm text-[#61707A]">Sign in to your portal</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <InputField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <InputField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-[#b23b30]">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Sign in</Button>
        </form>

        <div className="mt-6 border-t border-[#1F3D5C]/10 pt-4">
          <p className="text-xs font-semibold text-[#61707A] mb-2 text-center">Demo logins (password: Password123!)</p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO.map((d) => (
              <button key={d.role} type="button"
                onClick={() => { setEmail(d.email); setPassword('Password123!'); setError(''); }}
                className="rounded-lg border border-[#1F3D5C]/15 py-2 text-xs font-semibold text-[#1F3D5C] hover:border-[#3E9C8E] hover:text-[#2F7D71]">
                {d.role}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#8ba0b1] mt-2 text-center">Tap a role, then Sign in. Admin opens the full dashboard.</p>
        </div>
      </div>
      </div>
    </div>
  );
}
