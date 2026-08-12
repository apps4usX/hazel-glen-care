// Public marketing shell: header (logo + nav + auth-aware CTA) and footer.
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import Seo from '../Seo';
import ChatWidget from '../ChatWidget';

const HOME = { ADMIN: '/admin/dashboard', STAFF: '/staff', CLIENT: '/client' };
const LINKS = [['Services', '#services'], ['About', '#about'], ['Careers', '#careers'], ['Contact', '#contact']];

// Replace the # links with the real Hazel Glen Care social accounts.
const SOCIALS = [
  { name: 'WhatsApp', href: 'https://wa.me/27000000000', path: 'M12 3C6.9 3 2.8 6.4 2.8 10.7c0 2.2 1.1 4.2 2.9 5.6-.1 1-.6 2.3-1.6 3.4 1.6-.2 3.2-.8 4.4-1.7 1.1.3 2.2.5 3.5.5 5.1 0 9.2-3.4 9.2-7.8S17.1 3 12 3z' },
  { name: 'Facebook', href: '#', path: 'M13.5 21v-7h2.4l.4-2.8h-2.8V9.4c0-.8.2-1.4 1.4-1.4h1.5V5.5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2H8.3V14h2.6v7h2.6z' },
  { name: 'Instagram', href: '#', path: 'M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5zm0 5.8a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6zM16 4H8a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V8a4 4 0 0 0-4-4zm2.8 12A2.8 2.8 0 0 1 16 18.8H8A2.8 2.8 0 0 1 5.2 16V8A2.8 2.8 0 0 1 8 5.2h8A2.8 2.8 0 0 1 18.8 8v8zM17 7.6a.9.9 0 1 1-1.8 0 .9.9 0 0 1 1.8 0z' },
  { name: 'X', href: '#', path: 'M17.5 3h2.7l-5.9 6.7L21 21h-5.4l-4.2-5.5L6.5 21H3.8l6.3-7.2L3 3h5.5l3.8 5 4.2-5zm-.9 16h1.5L7.5 4.5H5.9L16.6 19z' },
];

function Socials({ dark = true }) {
  return (
    <div className="flex gap-2">
      {SOCIALS.map((s) => (
        <a key={s.name} href={s.href} target="_blank" rel="noreferrer" aria-label={s.name}
          className={`h-9 w-9 grid place-items-center rounded-full transition ${dark ? 'bg-white/10 text-white hover:bg-[#3E9C8E]' : 'bg-[#1F3D5C]/5 text-[#1F3D5C] hover:bg-[#3E9C8E] hover:text-white'}`}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d={s.path} /></svg>
        </a>
      ))}
    </div>
  );
}

export default function PublicLayout({ children }) {
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }} className="bg-white text-[#33424E]">
      <Seo />
      {/* utility bar */}
      <div className="bg-[#14293D] text-[#cdd8e2] text-[13px]">
        <div className="mx-auto max-w-6xl px-5 py-2 flex justify-between items-center">
          <span className="hidden sm:block">Compassionate nursing &amp; home care, matched to your family — available 24/7</span>
          <div className="flex gap-4">
            <a href="tel:+27000000000" className="hover:text-white">+27 (0)00 000 0000</a>
            <a href="mailto:care@hazelglencare.co.za" className="hover:text-white hidden sm:block">care@hazelglencare.co.za</a>
          </div>
        </div>
      </div>

      {/* header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#1F3D5C]/10">
        <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Hazel Glen Care" className="h-12 w-12" />
            <span className="leading-none">
              <span className="block font-bold text-[#1F3D5C] text-xl" style={{ fontFamily: 'Poppins, sans-serif' }}>Hazel Glen</span>
              <span className="block text-[10px] tracking-[0.3em] text-[#2F7D71] font-bold">CARE</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 font-semibold text-[15px]">
            {LINKS.map(([l, h]) => <a key={l} href={h} className="hover:text-[#1F3D5C]">{l}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href={HOME[user.role] || '/login'} className="rounded-xl bg-[#3E9C8E] text-white font-semibold px-4 py-2.5 text-sm hover:bg-[#2F7D71]">My Portal</Link>
            ) : (
              <>
                <Link href="/login" className="rounded-xl border-2 border-[#1F3D5C]/15 text-[#1F3D5C] font-semibold px-4 py-2.5 text-sm hover:border-[#1F3D5C]">Sign in</Link>
                <a href="#contact" className="hidden sm:inline-block rounded-xl bg-[#3E9C8E] text-white font-semibold px-4 py-2.5 text-sm hover:bg-[#2F7D71]">Book a Carer</a>
              </>
            )}
            <button className="md:hidden h-10 w-10 grid place-items-center rounded-lg border border-[#1F3D5C]/15" aria-label="Menu" onClick={() => setMenu((m) => !m)}>
              <span className="block w-5 space-y-1">
                <span className="block h-0.5 bg-[#1F3D5C]" /><span className="block h-0.5 bg-[#1F3D5C]" /><span className="block h-0.5 bg-[#1F3D5C]" />
              </span>
            </button>
          </div>
        </div>
        {menu && (
          <div className="md:hidden border-t border-[#1F3D5C]/10 bg-white px-5 py-3">
            <nav className="flex flex-col gap-1 font-semibold">
              {LINKS.map(([l, h]) => <a key={l} href={h} onClick={() => setMenu(false)} className="py-2 hover:text-[#1F3D5C]">{l}</a>)}
              <Link href="/login" onClick={() => setMenu(false)} className="py-2 text-[#2F7D71]">Sign in (Client · Staff · Admin) →</Link>
            </nav>
          </div>
        )}
      </header>

      <main>{children}</main>
      <ChatWidget />

      {/* footer */}
      <footer className="bg-[#14293D] text-[#c3d1dc] pt-14 pb-6">
        <div className="mx-auto max-w-6xl px-5 grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.png" alt="" className="h-11 w-11 rounded-full bg-[#F5EEE2] p-0.5" />
              <span className="font-bold text-white text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>Hazel Glen Care</span>
            </div>
            <p className="text-sm text-[#a9bccb] max-w-xs mb-4">Inclusive nursing and home care across Gauteng — trusted people, delivered with a caring hand.</p>
            <Socials />
          </div>
          <FooterCol title="Services" links={['Nursing Agency', 'Dementia Care', 'General & Home Care', 'Careers']} />
          <FooterCol title="Portals" links={[['Client Login', '/login'], ['Staff Login', '/login'], ['Admin', '/login']]} />
          <div>
            <h5 className="text-white text-xs tracking-widest uppercase mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Contact</h5>
            <ul className="space-y-1.5 text-sm">
              <li>Unit 13, Smithfield Complex</li>
              <li>70 Bass Street, Boksburg</li>
              <li>Gauteng, 1459</li>
              <li><a className="hover:text-[#3E9C8E]" href="mailto:care@hazelglencare.co.za">care@hazelglencare.co.za</a></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5 mt-10 pt-5 border-t border-white/10 flex flex-wrap justify-between gap-2 text-xs text-[#8ba0b1]">
          <span>© 2026 Hazel Glen Care. All rights reserved.</span>
          <span>Privacy Policy · Terms · POPIA</span>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h5 className="text-white text-xs tracking-widest uppercase mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</h5>
      <ul className="space-y-1.5 text-sm">
        {links.map((l) => {
          const [label, href] = Array.isArray(l) ? l : [l, '#'];
          return <li key={label}><a className="hover:text-[#3E9C8E]" href={href}>{label}</a></li>;
        })}
      </ul>
    </div>
  );
}
