import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Table, Row, Cell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import InputField from '../../components/forms/InputField';
import { withAuth } from '../../lib/auth';
import { api } from '../../lib/api';

const CARE = ['NURSING_AGENCY', 'DEMENTIA_CARE', 'GENERAL_CARE', 'HOME_CARE'];
const STATUSES = ['', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
function fmt(dt) { return new Date(dt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }); }

function Shifts() {
  const [shifts, setShifts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const blank = { clientId: '', title: '', careType: 'GENERAL_CARE', date: '', start: '', end: '', headcount: 1, requiredSkill: '', payRate: '', chargeRate: '' };
  const [form, setForm] = useState(blank);

  async function load() {
    setLoading(true);
    try {
      const [{ shifts }, cl] = await Promise.all([api.shifts.list(filter ? { status: filter } : undefined), api.clients.list().catch(() => ({ clients: [] }))]);
      setShifts(shifts); setClients(cl.clients || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);
  function flash(m) { setToast(m); setTimeout(() => setToast(''), 3500); }

  async function viewCandidates(shift) {
    setBusy(shift.id);
    try { const { candidates } = await api.shifts.candidates(shift.id, 8); setPanel({ shift, candidates }); }
    catch (e) { flash(e.message); } finally { setBusy(null); }
  }
  async function autoAssign(shift) {
    setBusy(shift.id);
    try { const res = await api.shifts.autoAssign(shift.id); flash(`Assigned ${res.assigned.length} — ${res.status.toLowerCase()}.`); await load(); }
    catch (e) { flash(e.message); } finally { setBusy(null); }
  }
  async function broadcast(shift) {
    setBusy(shift.id);
    try { const res = await api.shifts.broadcast(shift.id); flash(`Broadcast to ${res.notified} staff.`); await load(); }
    catch (e) { flash(e.message); } finally { setBusy(null); }
  }
  async function cancel(shift) {
    setBusy(shift.id);
    try { await api.shifts.cancel(shift.id); flash('Shift cancelled.'); await load(); }
    catch (e) { flash(e.message); } finally { setBusy(null); }
  }
  async function createShift(e) {
    e.preventDefault();
    setBusy('new');
    try {
      await api.shifts.create({
        clientId: form.clientId, title: form.title, careType: form.careType,
        startAt: `${form.date}T${form.start}`, endAt: `${form.date}T${form.end}`,
        headcount: Number(form.headcount) || 1, requiredSkill: form.requiredSkill || undefined,
        payRate: form.payRate ? Number(form.payRate) : undefined, chargeRate: form.chargeRate ? Number(form.chargeRate) : undefined,
      });
      flash('Shift created.'); setShowNew(false); setForm(blank); await load();
    } catch (err) { flash(err.message); } finally { setBusy(null); }
  }

  return (
    <DashboardLayout title="Shifts" actions={<Button variant="primary" onClick={() => setShowNew(true)}>+ New shift</Button>}>
      {toast && <div className="mb-4 rounded-xl bg-[#E4F0EC] text-[#2F7D71] px-4 py-2 text-sm">{toast}</div>}

      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-[#61707A]">Filter:</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-[#1F3D5C]/15 bg-white px-3 py-2 text-sm">
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      <Table columns={['Shift', 'Client', 'When', 'Care', 'Status', 'Actions']}>
        {(loading ? [] : shifts).map((s) => (
          <Row key={s.id}>
            <Cell className="font-medium text-[#1F3D5C]">{s.title}{s.isEmergency && ' 🚨'}</Cell>
            <Cell>{s.client?.name}</Cell>
            <Cell className="whitespace-nowrap">{fmt(s.startAt)}</Cell>
            <Cell>{s.careType?.replaceAll('_', ' ').toLowerCase()}</Cell>
            <Cell><Badge status={s.status} /></Cell>
            <Cell>
              <div className="flex gap-2 flex-wrap">
                {['OPEN', 'PARTIALLY_FILLED'].includes(s.status) && <>
                  <Button variant="ghost" onClick={() => viewCandidates(s)} loading={busy === s.id}>Candidates</Button>
                  <Button variant="primary" onClick={() => autoAssign(s)} loading={busy === s.id}>Auto-assign</Button>
                  {s.isEmergency && <Button variant="danger" onClick={() => broadcast(s)} loading={busy === s.id}>Broadcast</Button>}
                  <Button variant="ghost" onClick={() => cancel(s)} loading={busy === s.id}>Cancel</Button>
                </>}
              </div>
            </Cell>
          </Row>
        ))}
      </Table>
      {!loading && shifts.length === 0 && <p className="mt-4 text-sm text-[#61707A]">No shifts found.</p>}

      {/* candidate panel */}
      {panel && (
        <Modal onClose={() => setPanel(null)} title="Best-matched staff" subtitle={panel.shift.title}>
          {panel.candidates.length === 0 && <p className="text-sm text-[#61707A]">No eligible staff found.</p>}
          <div className="space-y-3">
            {panel.candidates.map((c) => (
              <Card key={c.staffId} className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#1F3D5C]">{c.name || c.staffId}</div>
                  <div className="text-xs text-[#61707A]">{Object.entries(c.breakdown || {}).map(([k, v]) => `${k} ${v}`).join(' · ')}{c.distanceKm != null && ` · ${c.distanceKm.toFixed(1)} km`}</div>
                </div>
                <div className="text-right"><div className="text-2xl font-bold text-[#2F7D71]" style={{ fontFamily: 'Poppins, sans-serif' }}>{c.score}</div><div className="text-[10px] text-[#61707A]">match</div></div>
              </Card>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPanel(null)}>Close</Button>
            <Button variant="primary" onClick={() => { autoAssign(panel.shift); setPanel(null); }}>Auto-assign top</Button>
          </div>
        </Modal>
      )}

      {/* new shift modal */}
      {showNew && (
        <Modal onClose={() => setShowNew(false)} title="Create a shift">
          <form onSubmit={createShift} className="grid sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2">
              <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Client</span>
              <select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="w-full rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm">
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <InputField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="sm:col-span-2" />
            <label className="block">
              <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Care type</span>
              <select value={form.careType} onChange={(e) => setForm({ ...form, careType: e.target.value })} className="w-full rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm">
                {CARE.map((c) => <option key={c} value={c}>{c.replaceAll('_', ' ').toLowerCase()}</option>)}
              </select>
            </label>
            <InputField label="Required skill (optional)" value={form.requiredSkill} onChange={(e) => setForm({ ...form, requiredSkill: e.target.value })} />
            <InputField label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            <InputField label="Carers needed" type="number" min="1" value={form.headcount} onChange={(e) => setForm({ ...form, headcount: e.target.value })} />
            <InputField label="Start" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required />
            <InputField label="End" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} required />
            <InputField label="Pay rate / hr" type="number" value={form.payRate} onChange={(e) => setForm({ ...form, payRate: e.target.value })} />
            <InputField label="Charge rate / hr" type="number" value={form.chargeRate} onChange={(e) => setForm({ ...form, chargeRate: e.target.value })} />
            <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
              <Button variant="outline" type="button" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={busy === 'new'}>Create shift</Button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-30 p-4" onClick={onClose}>
      <div className="bg-[#F5EEE2] w-full max-w-lg rounded-2xl p-6 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</h3>
          <button onClick={onClose} className="text-[#61707A]">✕</button>
        </div>
        {subtitle && <p className="text-sm text-[#61707A] mb-4">{subtitle}</p>}
        <div className={subtitle ? '' : 'mt-4'}>{children}</div>
      </div>
    </div>
  );
}

export default withAuth(Shifts, { role: 'ADMIN' });
