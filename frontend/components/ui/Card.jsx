// Card + stat tile.
export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white border border-[#1F3D5C]/10 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint, accent = '#3E9C8E' }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#61707A]">{label}</span>
      <span className="text-3xl font-bold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {value}
      </span>
      {hint && <span className="text-xs text-[#61707A]">{hint}</span>}
      <span className="mt-2 h-1 w-10 rounded" style={{ background: accent }} />
    </Card>
  );
}
