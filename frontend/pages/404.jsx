import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-[#14293D] px-4 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div>
        <img src="/logo.png" alt="Hazel Glen Care" className="h-16 w-16 mx-auto mb-6 rounded-full bg-[#F5EEE2] p-1" />
        <div className="text-6xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>404</div>
        <p className="text-[#c3d1dc] mt-2 mb-6">Sorry — we couldn’t find that page.</p>
        <Link href="/" className="rounded-xl bg-[#3E9C8E] text-white px-6 py-3 font-semibold hover:bg-[#2F7D71]">Back to home</Link>
      </div>
    </div>
  );
}
