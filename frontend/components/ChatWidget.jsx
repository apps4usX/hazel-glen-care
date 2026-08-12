// Floating chat widget: quick-reply assistant with a WhatsApp hand-off.
// Self-contained (no backend). Swap WHATSAPP / links for the real accounts.
import { useState } from 'react';

const WHATSAPP = '27000000000'; // ← replace with the real WhatsApp number (no +, no spaces)
const EMAIL = 'care@hazelglencare.co.za';
const PHONE = '+27000000000';

const REPLIES = {
  book: {
    q: 'Book a carer',
    a: "Wonderful — we can usually place a vetted carer within 24 hours. Tell us who needs care and where, and our team will call you back. The fastest way is WhatsApp below, or use the enquiry form on the Contact section.",
  },
  services: {
    q: 'What services do you offer?',
    a: 'We provide a nursing agency (RNs, ENs & care assistants), specialist dementia care, and general & home care across Boksburg and greater Gauteng — day or night.',
  },
  careers: {
    q: "I'm a nurse/carer looking for work",
    a: "We'd love to hear from you! Head to the Careers section to apply, or message us on WhatsApp and we'll send you the next steps.",
  },
  hours: {
    q: 'What are your hours?',
    a: 'Our coordination line is available 24/7 for care enquiries and shift cover. Office admin runs Monday–Friday, 08:00–17:00.',
  },
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState([
    { from: 'bot', text: 'Hi 👋 I’m the Hazel Glen Care assistant. How can we help today?' },
  ]);

  function ask(key) {
    const r = REPLIES[key];
    setThread((t) => [...t, { from: 'me', text: r.q }, { from: 'bot', text: r.a }]);
  }
  const waLink = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hi Hazel Glen Care, I’d like to enquire about care.')}`;

  return (
    <>
      {/* launcher */}
      <button onClick={() => setOpen((o) => !o)} aria-label="Chat with us"
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-[#3E9C8E] text-white shadow-xl grid place-items-center hover:bg-[#2F7D71] transition">
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.9 3 2.8 6.4 2.8 10.7c0 2.2 1.1 4.2 2.9 5.6-.1 1-.6 2.3-1.6 3.4 1.6-.2 3.2-.8 4.4-1.7 1.1.3 2.2.5 3.5.5 5.1 0 9.2-3.4 9.2-7.8S17.1 3 12 3z" /></svg>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[92vw] max-w-sm rounded-2xl bg-white shadow-2xl border border-[#1F3D5C]/10 overflow-hidden flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
          <div className="bg-[#14293D] text-white px-4 py-3 flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-9 w-9 rounded-full bg-[#F5EEE2] p-0.5" />
            <div>
              <div className="font-bold leading-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Hazel Glen Care</div>
              <div className="text-[11px] text-[#3E9C8E]">Typically replies within minutes</div>
            </div>
          </div>

          <div className="p-3 space-y-2 max-h-72 overflow-y-auto bg-[#F7F3EC]">
            {thread.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-2xl px-3 py-2 text-sm max-w-[85%] ${msg.from === 'me' ? 'bg-[#3E9C8E] text-white' : 'bg-white text-[#33424E] border border-[#1F3D5C]/10'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[#1F3D5C]/10">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(REPLIES).map(([k, r]) => (
                <button key={k} onClick={() => ask(k)}
                  className="text-xs rounded-full border border-[#1F3D5C]/15 px-2.5 py-1 text-[#1F3D5C] hover:border-[#3E9C8E] hover:text-[#2F7D71]">
                  {r.q}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <a href={waLink} target="_blank" rel="noreferrer" className="col-span-3 rounded-xl bg-[#25D366] text-white font-semibold text-sm py-2.5 text-center hover:opacity-90">Chat on WhatsApp</a>
              <a href={`tel:${PHONE}`} className="rounded-xl border border-[#1F3D5C]/15 text-[#1F3D5C] text-xs font-semibold py-2 text-center hover:border-[#1F3D5C]">Call</a>
              <a href={`mailto:${EMAIL}`} className="col-span-2 rounded-xl border border-[#1F3D5C]/15 text-[#1F3D5C] text-xs font-semibold py-2 text-center hover:border-[#1F3D5C]">Email us</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
