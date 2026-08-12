// Lightweight, dependency-free SVG charts in the Hazel Glen palette.
// Donut, Area, GroupedBars, Funnel, Legend. All responsive (width:100%).

export const PALETTE = {
  navy: '#1F3D5C', teal: '#3E9C8E', gold: '#B4893C', red: '#C0453B',
  sky: '#6FA8C7', muted: '#A9BCCB', green: '#2F7D4E',
};

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-xs text-[#61707A]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
          {i.label}{i.value != null && <b className="text-[#1F3D5C]">&nbsp;{i.value}</b>}
        </span>
      ))}
    </div>
  );
}

/** Donut / ring chart. data: [{label, value, color}] */
export function Donut({ data, size = 168, thickness = 26, centerLabel, centerSub }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const cx = size / 2;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#EDE7DA" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = `${frac * c} ${c - frac * c}`;
          const el = (
            <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={d.color} strokeWidth={thickness}
              strokeDasharray={dash} strokeDashoffset={-offset * c}
              transform={`rotate(-90 ${cx} ${cx})`} strokeLinecap="butt" />
          );
          offset += frac;
          return el;
        })}
        {centerLabel != null && (
          <text x={cx} y={cx - 2} textAnchor="middle" fontSize="26" fontWeight="700" fill="#1F3D5C" fontFamily="Poppins, sans-serif">{centerLabel}</text>
        )}
        {centerSub && <text x={cx} y={cx + 16} textAnchor="middle" fontSize="11" fill="#61707A">{centerSub}</text>}
      </svg>
      <Legend items={data.map((d) => ({ label: d.label, value: d.value, color: d.color }))} />
    </div>
  );
}

/** Area/line chart. points: [{label, value}] */
export function Area({ points, color = PALETTE.teal, height = 150, suffix = '' }) {
  const w = 320, pad = 24;
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const x = (i) => pad + i * step;
  const y = (v) => height - 22 - (v / max) * (height - 40);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${height - 22} L${x(0)},${height - 22} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`g-${color.slice(1)}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g-${color.slice(1)})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="3" fill="#fff" stroke={color} strokeWidth="2" />
          <text x={x(i)} y={y(p.value) - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="#1F3D5C">{p.value}{suffix}</text>
          <text x={x(i)} y={height - 8} textAnchor="middle" fontSize="9" fill="#8ba0b1">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

/** Grouped bars. data:[{label, a, b}], keys:{a:'Filled',b:'Open'} */
export function GroupedBars({ data, keys, colors, height = 160 }) {
  const w = 320, pad = 26, gap = 10;
  const groups = data.length || 1;
  const gw = (w - pad * 2) / groups;
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  const bw = (gw - gap) / 2;
  const y = (v) => height - 22 - (v / max) * (height - 40);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" style={{ display: 'block' }}>
      {data.map((d, i) => {
        const gx = pad + i * gw + gap / 2;
        return (
          <g key={i}>
            <rect x={gx} y={y(d.a)} width={bw} height={height - 22 - y(d.a)} rx="2" fill={colors.a} />
            <rect x={gx + bw + 2} y={y(d.b)} width={bw} height={height - 22 - y(d.b)} rx="2" fill={colors.b} />
            <text x={gx + bw} y={height - 8} textAnchor="middle" fontSize="9" fill="#8ba0b1">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Horizontal funnel. data:[{stage,count}] */
export function Funnel({ data, color = PALETTE.navy }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const nice = (s) => s.charAt(0) + s.slice(1).toLowerCase();
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => (
        <div key={d.stage} className="flex items-center gap-2">
          <span className="w-20 text-xs text-[#61707A] shrink-0">{nice(d.stage)}</span>
          <div className="flex-1 h-6 rounded bg-[#F0EADF] overflow-hidden">
            <div className="h-full rounded flex items-center justify-end pr-2 text-[11px] font-bold text-white"
              style={{ width: `${Math.max(8, (d.count / max) * 100)}%`, background: color, opacity: 1 - i * 0.11 }}>
              {d.count}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
