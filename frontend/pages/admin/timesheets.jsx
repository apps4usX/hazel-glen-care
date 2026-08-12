import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Table, Row, Cell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Donut, PALETTE } from '../../components/ui/Charts';
import AuthImage from '../../components/AuthImage';
import { withAuth } from '../../lib/auth';
import { api } from '../../lib/api';

const FILTERS = ['', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'];
function time(dt) { return dt ? new Date(dt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : '—'; }

function Timesheets() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('SUBMITTED');
  const [busy, setBusy] = useState(null);
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState('');
  const [metrics, setMetrics] = useState(null);

  async function load() {
    setLoading(true);
    try { const { timesheets } = await api.timesheets.list(filter || undefined); setRows(timesheets); }
    catch (e) { setToast(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);
  useEffect(() => { api.metrics.dashboard().then(setMetrics).catch(() => {}); }, []);
  function flash(m) { setToast(m); setTimeout(() => setToast(''), 3000); }

  async function setStatus(t, status) {
    setBusy(t.id);
    try { await api.timesheets.setStatus(t.id, status); flash(`${status.toLowerCase()}`); await load(); }
    catch (e) { flash(e.message); } finally { setBusy(null); }
  }

  return (
    <DashboardLayout title="Timesheets & attendance">
      {toast && <div className="mb-4 rounded-xl bg-[#E4F0EC] text-[#2F7D71] px-4 py-2 text-sm">{toast}</div>}

      {metrics && (() => {
        const a = [
          { label: 'Approved', value: metrics.attendance.byStatus.APPROVED || 0, color: PALETTE.green },
          { label: 'Submitted', value: metrics.attendance.byStatus.SUBMITTED || 0, color: PALETTE.gold },
          { label: 'Paid', value: metrics.attendance.byStatus.PAID || 0, color: PALETTE.navy },
          { label: 'Rejected', value: metrics.attendance.byStatus.REJECTED || 0, color: PALETTE.red },
        ].filter((x) => x.value > 0);
        return a.length ? (
          <Card className="mb-6">
            <h3 className="font-bold text-[#1F3D5C] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Attendance overview</h3>
            <Donut data={a} centerLabel={`${metrics.attendance.verifiedPct}%`} centerSub="verified" />
            <p className="mt-2 text-xs text-[#61707A]">{metrics.attendance.clockedIn} clock-ins · {metrics.attendance.verifiedPct}% with photo + GPS · {metrics.hours.total}h logged (6 wks)</p>
          </Card>
        ) : null;
      })()}

      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-[#61707A]">Filter:</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-[#1F3D5C]/15 bg-white px-3 py-2 text-sm">
          {FILTERS.map((s) => <option key={s} value={s}>{s || 'All'}</option>)}
        </select>
      </div>

      <Table columns={['Staff', 'Shift', 'Date', 'Hours', 'Verified', 'Status', 'Actions']}>
        {(loading ? [] : rows).map((t) => {
          const a = t.shiftAssignment;
          const verified = a?.checkInPhoto ? '📷' : '';
          const gps = a?.checkInLat ? '📍' : '';
          return (
            <Row key={t.id}>
              <Cell className="font-medium text-[#1F3D5C]">{t.staff.firstName} {t.staff.lastName}</Cell>
              <Cell>{a?.shift?.title || '—'}<div className="text-xs text-[#61707A]">{a?.shift?.client?.name}</div></Cell>
              <Cell>{new Date(t.workDate).toLocaleDateString('en-ZA')}</Cell>
              <Cell>{Number(t.hoursWorked)}</Cell>
              <Cell>{verified}{gps || (!verified && '—')}</Cell>
              <Cell><Badge status={t.status} /></Cell>
              <Cell>
                <div className="flex gap-1.5 flex-wrap">
                  {a && <Button variant="ghost" onClick={() => setDetail(t)}>View</Button>}
                  {t.status === 'SUBMITTED' && <>
                    <Button variant="primary" loading={busy === t.id} onClick={() => setStatus(t, 'APPROVED')}>Approve</Button>
                    <Button variant="ghost" loading={busy === t.id} onClick={() => setStatus(t, 'REJECTED')}>Reject</Button>
                  </>}
                  {t.status === 'APPROVED' && <Button variant="navy" loading={busy === t.id} onClick={() => setStatus(t, 'PAID')}>Mark paid</Button>}
                </div>
              </Cell>
            </Row>
          );
        })}
      </Table>
      {!loading && rows.length === 0 && <p className="mt-4 text-sm text-[#61707A]">No timesheets match this filter.</p>}

      {detail && (() => {
        const a = detail.shiftAssignment || {};
        const map = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
        return (
          <div className="fixed inset-0 bg-black/30 grid place-items-center z-30 p-4" onClick={() => setDetail(null)}>
            <div className="bg-white w-full max-w-lg rounded-2xl p-6 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-[#1F3D5C] text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>{detail.staff.firstName} {detail.staff.lastName}</h3>
                  <p className="text-sm text-[#61707A]">{a.shift?.title} · {a.shift?.client?.name}</p>
                </div>
                <Badge status={detail.status} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-[#1F3D5C] mb-1">Clock in</div>
                  <div className="text-[#61707A]">{time(a.checkInAt)}</div>
                  {a.checkInLat != null && <a className="text-[#2F7D71]" href={map(a.checkInLat, a.checkInLng)} target="_blank" rel="noreferrer">📍 View location</a>}
                  {a.checkInPhoto && <AuthImage path={a.checkInPhoto} alt="clock-in selfie" className="mt-2 rounded-lg w-full h-40 object-cover" />}
                </div>
                <div>
                  <div className="font-semibold text-[#1F3D5C] mb-1">Clock out</div>
                  <div className="text-[#61707A]">{time(a.checkOutAt)}</div>
                  {a.checkOutLat != null && <a className="text-[#2F7D71]" href={map(a.checkOutLat, a.checkOutLng)} target="_blank" rel="noreferrer">📍 View location</a>}
                  {a.checkOutPhoto && <AuthImage path={a.checkOutPhoto} alt="clock-out selfie" className="mt-2 rounded-lg w-full h-40 object-cover" />}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-[#1F3D5C]"><b>{Number(detail.hoursWorked)}</b> hours</div>
                <div className="flex gap-2">
                  {detail.status === 'SUBMITTED' && <>
                    <Button variant="ghost" onClick={() => { setStatus(detail, 'REJECTED'); setDetail(null); }}>Reject</Button>
                    <Button variant="primary" onClick={() => { setStatus(detail, 'APPROVED'); setDetail(null); }}>Approve</Button>
                  </>}
                  <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
}

export default withAuth(Timesheets, { role: 'ADMIN' });
