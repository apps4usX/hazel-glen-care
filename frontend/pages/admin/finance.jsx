import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Table, Row, Cell } from '../../components/ui/Table';
import InputField from '../../components/forms/InputField';
import { Area, PALETTE } from '../../components/ui/Charts';
import { withAuth } from '../../lib/auth';
import { api } from '../../lib/api';

function money(v) { return `R ${Number(v).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`; }
function isoDaysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

function Finance() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ clientId: '', start: isoDaysAgo(30), end: isoDaysAgo(0) });
  const [detail, setDetail] = useState(null);
  const [metrics, setMetrics] = useState(null);

  async function openDetail(id) {
    try { const { invoice } = await api.invoices.get(id); setDetail(invoice); }
    catch (e) { flash(e.message); }
  }

  async function load() {
    setLoading(true);
    try {
      const [{ invoices }, { clients }, mx] = await Promise.all([api.invoices.list(), api.clients.list(), api.metrics.dashboard().catch(() => null)]);
      setInvoices(invoices);
      setClients(clients);
      setMetrics(mx);
      setForm((f) => ({ ...f, clientId: f.clientId || clients[0]?.id || '' }));
    } catch (e) { setToast(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  function flash(m) { setToast(m); setTimeout(() => setToast(''), 4000); }

  async function generate(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { invoice } = await api.invoices.generate(form.clientId, new Date(form.start).toISOString(), new Date(form.end).toISOString());
      flash(`Invoice ${invoice.invoiceNumber} created — ${money(invoice.total)}.`);
      await load();
    } catch (err) { flash(err.message); }
    finally { setBusy(false); }
  }

  async function setStatus(inv, status) {
    try { await api.invoices.setStatus(inv.id, status); flash(`${inv.invoiceNumber} → ${status.toLowerCase()}`); await load(); }
    catch (e) { flash(e.message); }
  }

  const outstanding = invoices.filter((i) => i.status !== 'PAID' && i.status !== 'VOID')
    .reduce((a, i) => a + (Number(i.total) - Number(i.amountPaid)), 0);
  const collected = invoices.reduce((a, i) => a + Number(i.amountPaid), 0);

  return (
    <DashboardLayout title="Finance">
      {toast && <div className="mb-4 rounded-xl bg-[#E4F0EC] text-[#2F7D71] px-4 py-2 text-sm">{toast}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card><div className="text-xs uppercase text-[#61707A] font-semibold">Invoices</div><div className="text-3xl font-bold text-[#1F3D5C]">{invoices.length}</div></Card>
        <Card><div className="text-xs uppercase text-[#61707A] font-semibold">Outstanding</div><div className="text-3xl font-bold text-[#B4893C]">{money(outstanding)}</div></Card>
        <Card><div className="text-xs uppercase text-[#61707A] font-semibold">Collected</div><div className="text-3xl font-bold text-[#2f7d4e]">{money(collected)}</div></Card>
      </div>

      {metrics && (
        <Card className="mb-6">
          <h3 className="font-bold text-[#1F3D5C] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Revenue — last 6 months</h3>
          <div className="max-w-xl">
            <Area points={metrics.finance.revenueByMonth.map((r) => ({ label: r.label, value: Math.round(r.amount / 1000) }))} color={PALETTE.gold} suffix="k" />
          </div>
          <p className="text-xs text-[#61707A] mt-2">Values in thousands of Rand (R). Billed from approved timesheets.</p>
        </Card>
      )}

      <Card className="mb-6">
        <h3 className="font-bold text-[#1F3D5C] mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>Generate invoice</h3>
        <p className="text-sm text-[#61707A] mb-4">Bills a client’s submitted/approved timesheets in the period (hours × charge rate + 15% VAT).</p>
        <form onSubmit={generate} className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Client</span>
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              className="rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm min-w-[12rem]">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <InputField label="From" type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          <InputField label="To" type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
          <Button type="submit" variant="primary" loading={busy} disabled={!form.clientId}>Generate</Button>
        </form>
      </Card>

      <Table columns={['Number', 'Client', 'Issued', 'Total', 'Status', 'Actions']}>
        {(loading ? [] : invoices).map((i) => (
          <Row key={i.id}>
            <Cell className="font-medium text-[#1F3D5C]">{i.invoiceNumber}</Cell>
            <Cell>{i.client?.name}</Cell>
            <Cell>{new Date(i.issueDate).toLocaleDateString('en-ZA')}</Cell>
            <Cell>{money(i.total)}</Cell>
            <Cell><Badge status={i.status} /></Cell>
            <Cell>
              <div className="flex gap-2 flex-wrap">
                <Button variant="ghost" onClick={() => openDetail(i.id)}>View</Button>
                <Button variant="ghost" onClick={() => api.invoices.downloadPdf(i.id, `${i.invoiceNumber || 'invoice'}.pdf`).catch((e) => flash(e.message))}>PDF</Button>
                {i.status === 'DRAFT' && <Button variant="ghost" onClick={() => setStatus(i, 'SENT')}>Mark sent</Button>}
                {i.status !== 'PAID' && i.status !== 'VOID' && <Button variant="primary" onClick={() => setStatus(i, 'PAID')}>Mark paid</Button>}
              </div>
            </Cell>
          </Row>
        ))}
      </Table>
      {!loading && invoices.length === 0 && <p className="mt-4 text-sm text-[#61707A]">No invoices yet.</p>}

      {detail && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center z-30 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white w-full max-w-xl rounded-2xl p-6 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-[#1F3D5C] text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>{detail.invoiceNumber}</h3>
                <p className="text-sm text-[#61707A]">{detail.client?.name} · issued {new Date(detail.issueDate).toLocaleDateString('en-ZA')}</p>
              </div>
              <Badge status={detail.status} />
            </div>
            <Table columns={['Description', 'Qty', 'Rate', 'Amount']}>
              {detail.items.map((it) => (
                <Row key={it.id}>
                  <Cell className="text-[#1F3D5C]">{it.description}</Cell>
                  <Cell>{Number(it.quantity)}</Cell>
                  <Cell>{money(it.unitPrice)}</Cell>
                  <Cell>{money(it.amount)}</Cell>
                </Row>
              ))}
            </Table>
            <div className="mt-4 ml-auto max-w-xs text-sm space-y-1">
              <div className="flex justify-between text-[#61707A]"><span>Subtotal</span><span>{money(detail.subtotal)}</span></div>
              <div className="flex justify-between text-[#61707A]"><span>VAT ({Number(detail.taxRate)}%)</span><span>{money(detail.taxAmount)}</span></div>
              <div className="flex justify-between font-bold text-[#1F3D5C] text-base"><span>Total</span><span>{money(detail.total)}</span></div>
              <div className="flex justify-between text-[#2f7d4e]"><span>Paid</span><span>{money(detail.amountPaid)}</span></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="primary" onClick={() => api.invoices.downloadPdf(detail.id, `${detail.invoiceNumber || 'invoice'}.pdf`).catch((e) => flash(e.message))}>Download PDF</Button>
              <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default withAuth(Finance, { role: 'ADMIN' });
