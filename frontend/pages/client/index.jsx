import { useEffect, useState } from 'react';
import PortalLayout from '../../components/layout/PortalLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Table, Row, Cell } from '../../components/ui/Table';
import InputField from '../../components/forms/InputField';
import { withAuth } from '../../lib/auth';
import { api } from '../../lib/api';

const CARE = ['NURSING_AGENCY', 'DEMENTIA_CARE', 'GENERAL_CARE', 'HOME_CARE'];
function fmt(dt) { return new Date(dt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }); }
function money(v) { return `R ${Number(v).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`; }

function ClientPortal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ careType: 'GENERAL_CARE', date: '', start: '', end: '', headcount: 1, notes: '' });

  async function load() {
    setLoading(true);
    try { setData(await api.client.me()); } catch (e) { setToast(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  function flash(m) { setToast(m); setTimeout(() => setToast(''), 3500); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.client.createRequest({
        careType: form.careType,
        startAt: `${form.date}T${form.start}`,
        endAt: `${form.date}T${form.end}`,
        headcount: Number(form.headcount) || 1,
        notes: form.notes,
      });
      flash('Care request submitted — our team will be in touch.');
      setForm({ careType: 'GENERAL_CARE', date: '', start: '', end: '', headcount: 1, notes: '' });
      await load();
    } catch (err) { flash(err.message); } finally { setBusy(false); }
  }

  const shifts = data?.shifts || [];
  const invoices = data?.invoices || [];
  const requests = data?.requests || [];

  return (
    <PortalLayout title={data ? data.client.name : 'Client Portal'} subtitle="CLIENT PORTAL">
      {toast && <div className="mb-4 rounded-xl bg-[#E4F0EC] text-[#2F7D71] px-4 py-2 text-sm">{toast}</div>}
      {loading && <p className="text-[#61707A]">Loading…</p>}

      {/* request care */}
      <h2 className="font-bold text-[#1F3D5C] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Request care</h2>
      <Card className="mb-8">
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3 items-end">
          <label className="block">
            <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Care type</span>
            <select value={form.careType} onChange={(e) => setForm({ ...form, careType: e.target.value })}
              className="w-full rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm">
              {CARE.map((c) => <option key={c} value={c}>{c.replaceAll('_', ' ').toLowerCase()}</option>)}
            </select>
          </label>
          <InputField label="Carers needed" type="number" min="1" value={form.headcount} onChange={(e) => setForm({ ...form, headcount: e.target.value })} />
          <InputField label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="From" type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required />
            <InputField label="To" type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} required />
          </div>
          <label className="block sm:col-span-2">
            <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Notes</span>
            <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm" placeholder="Anything we should know…" />
          </label>
          <div className="sm:col-span-2"><Button type="submit" variant="primary" loading={busy}>Submit request</Button></div>
        </form>
      </Card>

      {/* requests */}
      <h2 className="font-bold text-[#1F3D5C] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>My requests</h2>
      <Table columns={['Care', 'When', 'Carers', 'Status']}>
        {requests.map((r) => (
          <Row key={r.id}>
            <Cell>{r.careType.replaceAll('_', ' ').toLowerCase()}</Cell>
            <Cell className="whitespace-nowrap">{fmt(r.startAt)}</Cell>
            <Cell>{r.headcount}</Cell>
            <Cell><Badge status={r.status} /></Cell>
          </Row>
        ))}
      </Table>
      {requests.length === 0 && !loading && <p className="text-sm text-[#61707A] mt-2">No requests yet.</p>}

      {/* bookings */}
      <h2 className="font-bold text-[#1F3D5C] mt-8 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Bookings</h2>
      <Table columns={['Shift', 'When', 'Carer', 'Status']}>
        {shifts.map((s) => (
          <Row key={s.id}>
            <Cell className="font-medium text-[#1F3D5C]">{s.title}</Cell>
            <Cell className="whitespace-nowrap">{fmt(s.startAt)}</Cell>
            <Cell>{s.assignments?.map((a) => `${a.staff.firstName} ${a.staff.lastName}`).join(', ') || '—'}</Cell>
            <Cell><Badge status={s.status} /></Cell>
          </Row>
        ))}
      </Table>
      {shifts.length === 0 && !loading && <p className="text-sm text-[#61707A] mt-2">No bookings yet.</p>}

      {/* invoices */}
      <h2 className="font-bold text-[#1F3D5C] mt-8 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Invoices</h2>
      <Table columns={['Number', 'Issued', 'Total', 'Status']}>
        {invoices.map((i) => (
          <Row key={i.id}>
            <Cell className="font-medium text-[#1F3D5C]">{i.invoiceNumber}</Cell>
            <Cell>{new Date(i.issueDate).toLocaleDateString('en-ZA')}</Cell>
            <Cell>{money(i.total)}</Cell>
            <Cell><Badge status={i.status} /></Cell>
          </Row>
        ))}
      </Table>
      {invoices.length === 0 && !loading && <p className="text-sm text-[#61707A] mt-2">No invoices yet.</p>}
    </PortalLayout>
  );
}

export default withAuth(ClientPortal, { role: 'CLIENT' });
