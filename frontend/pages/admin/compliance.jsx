import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Table, Row, Cell } from '../../components/ui/Table';
import { Donut, PALETTE } from '../../components/ui/Charts';
import { withAuth } from '../../lib/auth';
import { api } from '../../lib/api';

function Compliance() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scan, setScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [sel, setSel] = useState('');
  const [detail, setDetail] = useState(null);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState('');

  async function load() {
    setLoading(true);
    try { const { staff } = await api.directory.staff(); setStaff(staff); if (!sel && staff[0]) setSel(staff[0].id); }
    catch (e) { setToast(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  function flash(m) { setToast(m); setTimeout(() => setToast(''), 3500); }

  async function runScan() {
    setScanning(true);
    try { setScan(await api.compliance.scan(30)); await load(); }
    catch (e) { flash(e.message); } finally { setScanning(false); }
  }
  const [reminding, setReminding] = useState(false);
  async function remind() {
    setReminding(true);
    try { const r = await api.compliance.remind(30); flash(`${r.notificationsCreated} reminder(s) sent to admins for ${r.flagged} document(s).`); }
    catch (e) { flash(e.message); } finally { setReminding(false); }
  }
  async function check() {
    if (!sel) return;
    setChecking(true); setDetail(null);
    try { setDetail(await api.compliance.checkStaff(sel, 30)); }
    catch (e) { flash(e.message); } finally { setChecking(false); }
  }

  const attention = staff.filter((s) => !s.compliant || s.expiringSoon > 0).length;
  const compliantN = staff.filter((s) => s.compliant && !s.expiringSoon).length;
  const expiringN = staff.filter((s) => s.compliant && s.expiringSoon > 0).length;
  const nonCompliantN = staff.filter((s) => !s.compliant).length;
  const donut = [
    { label: 'Compliant', value: compliantN, color: PALETTE.green },
    { label: 'Expiring soon', value: expiringN, color: PALETTE.gold },
    { label: 'Not compliant', value: nonCompliantN, color: PALETTE.red },
  ].filter((x) => x.value > 0);

  return (
    <DashboardLayout title="Compliance">
      {toast && <div className="mb-4 rounded-xl bg-[#E4F0EC] text-[#2F7D71] px-4 py-2 text-sm">{toast}</div>}

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card><div className="text-xs uppercase text-[#61707A] font-semibold">Staff</div><div className="text-3xl font-bold text-[#1F3D5C]">{staff.length}</div></Card>
        <Card><div className="text-xs uppercase text-[#61707A] font-semibold">Compliant</div><div className="text-3xl font-bold text-[#2f7d4e]">{staff.filter((s) => s.compliant).length}</div></Card>
        <Card><div className="text-xs uppercase text-[#61707A] font-semibold">Need attention</div><div className="text-3xl font-bold text-[#C0453B]">{attention}</div></Card>
      </div>

      {!loading && donut.length > 0 && (
        <Card className="mb-6">
          <h3 className="font-bold text-[#1F3D5C] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Workforce compliance</h3>
          <Donut data={donut} centerLabel={staff.length} centerSub="staff" />
        </Card>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Staff compliance</h2>
        <div className="flex gap-2">
          <Button variant="outline" loading={reminding} onClick={remind}>Remind admins</Button>
          <Button variant="primary" loading={scanning} onClick={runScan}>Run expiry scan</Button>
        </div>
      </div>
      {scan && <div className="mb-4 rounded-xl bg-[#E4F0EC] text-[#2F7D71] px-4 py-2 text-sm">Scan complete — {scan.scanned} expiring soon, {scan.alertsCreated} new alert(s) raised.</div>}

      <Table columns={['Name', 'Role', 'Status', 'Compliance', 'Next expiry']}>
        {(loading ? [] : staff).map((s) => (
          <Row key={s.id}>
            <Cell className="font-medium text-[#1F3D5C]">{s.name}</Cell>
            <Cell>{s.jobTitle}</Cell>
            <Cell><Badge status={s.status} /></Cell>
            <Cell>{s.compliant ? <Badge tone="green">Compliant</Badge> : <Badge tone="red">Not compliant</Badge>}</Cell>
            <Cell>{s.nextExpiry ? <Badge tone="gold">{s.nextExpiry.type.replaceAll('_', ' ').toLowerCase()} · {s.nextExpiry.daysLeft}d</Badge> : <span className="text-[#61707A] text-sm">—</span>}</Cell>
          </Row>
        ))}
      </Table>
      {!loading && staff.length === 0 && <p className="mt-4 text-sm text-[#61707A]">No staff found.</p>}

      <Card className="mt-6">
        <h3 className="font-bold text-[#1F3D5C] mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>Document detail</h3>
        <p className="text-sm text-[#61707A] mb-4">Pick a staff member to see gaps and upcoming expiries.</p>
        <div className="flex gap-2 items-end flex-wrap">
          <label className="block">
            <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Staff member</span>
            <select value={sel} onChange={(e) => setSel(e.target.value)} className="rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm min-w-[14rem]">
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.jobTitle}</option>)}
            </select>
          </label>
          <Button variant="navy" loading={checking} onClick={check}>Check</Button>
        </div>
        {detail && (
          <div className="mt-4">
            <Badge tone={detail.compliant ? 'green' : 'red'}>{detail.compliant ? 'Compliant' : 'Not compliant'}</Badge>
            {detail.issues?.length > 0 && <ul className="mt-3 space-y-1 text-sm text-[#b23b30]">{detail.issues.map((i) => <li key={i}>• {i}</li>)}</ul>}
            {detail.expiring?.length > 0 && (
              <div className="mt-3 text-sm">
                <div className="font-semibold text-[#1F3D5C] mb-1">Expiring soon</div>
                {detail.expiring.map((e) => <div key={e.documentId} className="flex justify-between text-[#61707A]"><span>{e.type.replaceAll('_', ' ')}</span><span>{e.daysLeft} days</span></div>)}
              </div>
            )}
            {detail.compliant && (!detail.expiring || detail.expiring.length === 0) && <p className="mt-3 text-sm text-[#2f7d4e]">All documents present, verified and current.</p>}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}

export default withAuth(Compliance, { role: 'ADMIN' });
