import Link from 'next/link';
import PublicLayout from '../components/layout/PublicLayout';

// ---- inline care icons (no external images needed) ----
const ICONS = {
  nurse: <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z M12 8v6 M9 11h6" />,
  brain: <path d="M9 4a3 3 0 00-3 3 3 3 0 00-1 5 3 3 0 002 4 3 3 0 006 .5V5.5A2.5 2.5 0 009 4z M15 4a3 3 0 013 3 3 3 0 011 5 3 3 0 01-2 4" />,
  home: <path d="M4 11l8-6 8 6v8a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1z" />,
  heart: <path d="M12 20s-7-4.5-9-9a4.5 4.5 0 018-3 4.5 4.5 0 018 3c-2 4.5-9 9-9 9z" />,
  clock: <path d="M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17z M12 7v5l3 2" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
};
function Icon({ kind, size = 24, cls = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={cls}>
      {ICONS[kind]}
    </svg>
  );
}
// Branded "art" panel used in place of a photo — gradient + soft dot pattern + icon.
function ArtPanel({ kind, className = '', tone = 'teal' }) {
  const g = tone === 'navy'
    ? 'linear-gradient(135deg,#1F3D5C,#2F7D71)'
    : 'linear-gradient(135deg,#cfe3dc,#efe6d4)';
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: g }}>
      <div className="absolute inset-0 opacity-[0.5]" style={{
        backgroundImage: 'radial-gradient(rgba(31,61,92,.18) 1.2px, transparent 1.2px)',
        backgroundSize: '16px 16px',
      }} />
      <div className="absolute -right-6 -bottom-6 w-40 h-40 rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(255,255,255,.35),transparent 65%)' }} />
      <div className="relative h-full w-full grid place-items-center">
        <div className={`h-20 w-20 rounded-2xl grid place-items-center ${tone === 'navy' ? 'bg-white/15 text-white' : 'bg-white/70 text-[#1F3D5C]'} shadow-lg backdrop-blur-sm`}>
          <Icon kind={kind} size={38} />
        </div>
      </div>
    </div>
  );
}

const services = [
  { tag: 'Staffing', title: 'Nursing Agency', icon: 'nurse', img: '/photos/nursing.jpg', body: 'On-demand registered nurses, enrolled nurses and care assistants for hospitals, frail-care and private facilities — screened and shift-ready.' },
  { tag: 'Specialist', title: 'Dementia Care', icon: 'brain', img: '/photos/dementia.jpg', body: "Patient, specialised support for those living with dementia and Alzheimer's — protecting dignity, routine and safety, with families kept close." },
  { tag: 'At home', title: 'General & Home Care', icon: 'home', img: '/photos/homecare.jpg', body: 'Everyday help with mobility, medication reminders, personal care and companionship — so loved ones stay comfortable at home.' },
];
const features = [
  ['Vetted & compliant', 'Every carer is referenced and document-checked before placement.'],
  ['Smart matching', 'Carers matched to shifts by skills, availability and proximity.'],
  ['Compliance tracking', 'Automatic alerts before certificates expire, so cover never lapses.'],
  ['Genuine warmth', 'People who treat your loved ones with the dignity they deserve.'],
];
const quotes = [
  ['“Hazel Glen found us a wonderful nurse for my mother within a day. Kind, professional and completely reliable.”', 'Nomsa M.', 'Family client · Boksburg'],
  ['“Their carers turn up on time, ready and compliant. As a frail-care manager, that reliability is everything.”', 'Johan v.d. Merwe', 'Facility manager · Benoni'],
  ['“The dementia carer they placed with my dad is so patient and gentle. She’s become part of the family.”', 'Priya R.', 'Family client · Kempton Park'],
];

export default function Home() {
  return (
    <PublicLayout>
      {/* hero */}
      <section className="relative text-white overflow-hidden"
        style={{ background: 'linear-gradient(120deg,#132A40 0%,#1F3D5C 58%,#284c72 100%)' }}>
        <div className="mx-auto max-w-6xl px-5 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-[#bfe6dd] font-semibold tracking-widest text-xs uppercase" style={{ fontFamily: 'Poppins, sans-serif' }}>Nursing Agency · Boksburg, Gauteng</span>
            <h1 className="text-4xl md:text-5xl font-bold mt-3 leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Compassionate care, in a trusted pair of hands.</h1>
            <p className="mt-4 text-lg text-[#dbe6ef] max-w-xl">Hazel Glen Care connects families and facilities with vetted, compliant nurses and carers — from specialist dementia support to everyday care at home. Warm, reliable, day or night.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#contact" className="rounded-xl bg-[#3E9C8E] px-6 py-3 font-semibold hover:bg-[#2F7D71]">Request a Carer →</a>
              <a href="#services" className="rounded-xl border-2 border-white/50 px-6 py-3 font-semibold hover:bg-white/10">Explore Services</a>
            </div>
            <div className="mt-7 flex flex-wrap gap-2 text-sm">
              {['Vetted & referenced', 'POPIA compliant', 'Available 24/7'].map((c) => (
                <span key={c} className="rounded-full bg-white/10 border border-white/20 px-3 py-1.5 font-semibold">✓ {c}</span>
              ))}
            </div>
          </div>
          <div className="relative grid place-items-center min-h-[320px]">
            <div className="absolute w-72 h-72 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,.10), transparent 68%)' }} />
            <img src="/logo.png" alt="Hazel Glen Care" className="relative w-64 h-64" style={{ filter: 'drop-shadow(0 12px 30px rgba(0,0,0,.45))' }} />
          </div>
        </div>
      </section>

      {/* stats */}
      <div className="bg-[#F5EEE2]">
        <div className="mx-auto max-w-6xl px-5 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[['120+', 'Nurses & carers'], ['5k+', 'Care shifts filled'], ['24/7', 'On-call coordination'], ['4.9★', 'Family rating']].map(([n, l]) => (
            <div key={l}>
              <div className="text-3xl font-bold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>{n}</div>
              <div className="text-sm text-[#61707A]">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* services */}
      <section id="services" className="mx-auto max-w-6xl px-5 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[#2F7D71] font-semibold tracking-widest text-xs uppercase" style={{ fontFamily: 'Poppins, sans-serif' }}>How we help</span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1F3D5C] mt-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Care built around each person</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {services.map((s) => (
            <div key={s.title} className="rounded-2xl border border-[#1F3D5C]/10 overflow-hidden bg-white hover:shadow-xl transition">
              <img src={s.img} alt={s.title} className="h-44 w-full object-cover" />
              <div className="p-6">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#2F7D71] bg-[#E4F0EC] rounded-full px-2.5 py-0.5">{s.tag}</span>
                <h3 className="text-xl font-bold text-[#1F3D5C] mt-3 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>{s.title}</h3>
                <p className="text-[#61707A] text-[15px]">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* about */}
      <section id="about" className="bg-[#F5EEE2]">
        <div className="mx-auto max-w-6xl px-5 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div className="relative rounded-2xl min-h-[380px] overflow-hidden shadow-xl ring-1 ring-[#1F3D5C]/10">
            <img src="/brand/glass-award.jpg" alt="Hazel Glen Care crystal emblem" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: 'linear-gradient(to top, rgba(20,41,61,.72), transparent)' }} />
            <div className="absolute left-5 bottom-4 text-white">
              <div className="text-[11px] tracking-[0.25em] uppercase text-[#bfe0d8]" style={{ fontFamily: 'Poppins, sans-serif' }}>Our promise</div>
              <div className="font-bold text-lg leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>Care held with a steady hand</div>
            </div>
          </div>
          <div>
            <span className="text-[#2F7D71] font-semibold tracking-widest text-xs uppercase" style={{ fontFamily: 'Poppins, sans-serif' }}>Welcome to Hazel Glen Care</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1F3D5C] mt-2 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Care that feels like family</h2>
            <p className="text-[#61707A] text-lg mb-4">We believe everyone deserves to be looked after with warmth, respect and genuine attention. Our team pairs professional, fully-vetted carers with the people and facilities who need them — quickly, and with real heart.</p>
            <ul className="space-y-2 mb-6">
              {['Fully vetted staff — references, qualifications and documents verified.', 'Person-centred — care plans shaped around each individual.', 'Always reachable — coordination and on-call support, day or night.'].map((t) => (
                <li key={t} className="flex gap-2 text-[#33424E]"><span className="text-[#2F7D71]">✓</span><span>{t}</span></li>
              ))}
            </ul>
            <a href="#contact" className="inline-block rounded-xl bg-[#1F3D5C] text-white px-6 py-3 font-semibold hover:bg-[#14293D]">Talk to our team →</a>
          </div>
        </div>
      </section>

      {/* why us */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="text-center mb-12">
          <span className="text-[#2F7D71] font-semibold tracking-widest text-xs uppercase" style={{ fontFamily: 'Poppins, sans-serif' }}>Why families choose us</span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1F3D5C] mt-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Reliable people, backed by smart systems</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(([t, b]) => (
            <div key={t} className="rounded-2xl border border-[#1F3D5C]/10 bg-[#F5EEE2] p-6">
              <div className="h-11 w-11 rounded-xl bg-white grid place-items-center text-[#2F7D71] shadow mb-3 font-bold">✦</div>
              <h4 className="font-bold text-[#1F3D5C] mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>{t}</h4>
              <p className="text-sm text-[#61707A]">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* portals CTA */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 pb-20">
          <div className="rounded-3xl bg-[#14293D] text-white p-10 grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <h2 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>One secure platform for clients, staff & admin</h2>
              <p className="text-[#c3d1dc] mt-2">Book care, accept shifts, submit timesheets and manage compliance — all in one place.</p>
            </div>
            <div className="flex md:justify-end gap-2 flex-wrap">
              <Link href="/login" className="rounded-xl bg-[#3E9C8E] px-5 py-3 font-semibold hover:bg-[#2F7D71]">Client Login</Link>
              <Link href="/login" className="rounded-xl border-2 border-white/40 px-5 py-3 font-semibold hover:bg-white/10">Staff Login</Link>
            </div>
          </div>
        </div>
      </section>

      {/* testimonials */}
      <section className="bg-[#F5EEE2]">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="text-center mb-12">
            <span className="text-[#2F7D71] font-semibold tracking-widest text-xs uppercase" style={{ fontFamily: 'Poppins, sans-serif' }}>Kind words</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1F3D5C] mt-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Families &amp; facilities who trust us</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {quotes.map(([q, name, role]) => (
              <div key={name} className="rounded-2xl bg-white border border-[#1F3D5C]/10 p-6">
                <div className="text-[#e7b84b] mb-3">★★★★★</div>
                <p className="text-[#33424E]">{q}</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#E4F0EC] grid place-items-center text-[#2F7D71] font-bold">{name[0]}</div>
                  <div><div className="font-bold text-[#1F3D5C] text-sm">{name}</div><div className="text-xs text-[#61707A]">{role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* careers */}
      <section id="careers" className="mx-auto max-w-6xl px-5 py-20">
        <div className="rounded-3xl p-10 text-white grid md:grid-cols-3 gap-6 items-center"
          style={{ background: 'linear-gradient(120deg,#14293D,#2F7D71)' }}>
          <div className="md:col-span-2">
            <span className="text-[#bfe6dd] font-semibold tracking-widest text-xs uppercase" style={{ fontFamily: 'Poppins, sans-serif' }}>Careers</span>
            <h2 className="text-2xl md:text-3xl font-bold mt-1" style={{ fontFamily: 'Poppins, sans-serif' }}>Caring is a calling. Build yours with us.</h2>
            <p className="text-[#d7e6e2] mt-2 max-w-xl">We’re always looking for compassionate registered nurses, carers and support staff across Gauteng. Flexible shifts, prompt pay, and a team that has your back.</p>
          </div>
          <div className="flex md:justify-end gap-2 flex-wrap">
            <a href="#contact" className="rounded-xl bg-[#3E9C8E] px-5 py-3 font-semibold hover:bg-[#2F7D71]">View open roles</a>
            <a href="#contact" className="rounded-xl border-2 border-white/40 px-5 py-3 font-semibold hover:bg-white/10">Apply now</a>
          </div>
        </div>
      </section>

      {/* contact */}
      <section id="contact" className="mx-auto max-w-6xl px-5 pb-24">
        <div className="text-center mb-10">
          <span className="text-[#2F7D71] font-semibold tracking-widest text-xs uppercase" style={{ fontFamily: 'Poppins, sans-serif' }}>Get in touch</span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1F3D5C] mt-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Let’s arrange the right care</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <form className="rounded-2xl border border-[#1F3D5C]/10 bg-white p-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid sm:grid-cols-2 gap-4">
              <input className="rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm" placeholder="Full name" />
              <input className="rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm" placeholder="Phone" />
            </div>
            <input className="w-full rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm" placeholder="Email" />
            <select className="w-full rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm">
              <option>Nursing agency staffing</option><option>Dementia care</option><option>General &amp; home care</option>
            </select>
            <textarea rows="4" className="w-full rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm" placeholder="How can we help?" />
            <button className="w-full rounded-xl bg-[#3E9C8E] text-white px-6 py-3 font-semibold hover:bg-[#2F7D71]">Send enquiry →</button>
          </form>
          <div className="space-y-4">
            {[['Visit us', 'Unit 13, Smithfield Complex, 70 Bass Street, Boksburg, Gauteng, 1459'],
              ['Call us · 24/7', '+27 (0)00 000 0000'],
              ['Email us', 'care@hazelglencare.co.za']].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-[#1F3D5C]/10 bg-[#F5EEE2] p-5">
                <div className="font-bold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>{t}</div>
                <div className="text-[#61707A] text-sm mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
