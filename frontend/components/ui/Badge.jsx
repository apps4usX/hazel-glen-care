// Badge — colour tone keyed to status.
import { STATUS_TONE } from '../../config/theme';

const TONES = {
  teal: 'bg-[#E4F0EC] text-[#2F7D71]',
  gold: 'bg-[#F2E9D2] text-[#8a6a24]',
  green: 'bg-[#E3F2E7] text-[#2f7d4e]',
  red: 'bg-[#FBE7E5] text-[#b23b30]',
  muted: 'bg-[#EEF1F3] text-[#61707A]',
};

export default function Badge({ children, status, tone }) {
  const t = tone || STATUS_TONE[status] || 'muted';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[t]}`}>
      {children || status}
    </span>
  );
}
