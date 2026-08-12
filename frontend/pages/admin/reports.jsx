import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Table, Row, Cell } from '../../components/ui/Table';
import { withAuth } from '../../lib/auth';
import { api } from '../../lib/api';

const TYPES = ['SHIFTS', 'FINANCE', 'COMPLIANCE', 'RECRUITMENT', 'STAFF'];

function isoDaysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function Reports() {
  const [type, setType] = useState('SHIFTS');
  const [start, setStart] = useState(isoDaysAgo(30));
  const [end, setEnd] = useState(isoDaysAgo(0));
  const [generating, setGenerating] = useState(false);
  const [latest, setLatest] = useState(null);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    try { const { reports } = await api.reports.list(); setReports(reports); } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function generate(e) {
    e.preventDefault();
    setGenerating(true); setError('');
    try {
      const res = await api.reports.generate(type, new Date(start).toISOString(), new Date(end).toISOString());
      setLatest(res);
      await load();
    } catch (err) { setError(err.message); }
    finally { setGenerating(false); }
  }

  return (
    <DashboardLayout title="Reports">
      {error && <p className="mb-4 text-sm text-[#b23b30]">{error}</p>}

      <Card className="mb-6">
        <form onSubmit={generate} className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>From</span>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)}
              className="rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm" />
          </label>
          <label className="block">
            <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>To</span>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)}
              className="rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm" />
          </label>
          <Button type="submit" variant="primary" loading={generating}>Generate</Button>
        </form>

        {latest && (
          <div className="mt-5 rounded-xl bg-[#F5EEE2] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge tone="teal">{latest.report.type}</Badge>
              <span className="text-sm font-semibold text-[#1F3D5C]">{latest.report.title}</span>
            </div>
            <p className="text-sm text-[#33424E]">{latest.summary}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              {Object.entries(latest.metrics || {}).map(([k, v]) => (
                <div key={k}><span className="text-[#61707A]">{k}: </span><b className="text-[#1F3D5C]">{String(v)}</b></div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <h2 className="font-bold text-[#1F3D5C] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Recent reports</h2>
      <Table columns={['Type', 'Title', 'Summary', 'Generated']}>
        {reports.map((r) => (
          <Row key={r.id}>
            <Cell><Badge status={undefined} tone="teal">{r.type}</Badge></Cell>
            <Cell className="font-medium text-[#1F3D5C]">{r.title}</Cell>
            <Cell className="max-w-md text-[#61707A]">{r.summary}</Cell>
            <Cell className="whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString('en-ZA')}</Cell>
          </Row>
        ))}
      </Table>
      {reports.length === 0 && <p className="mt-4 text-sm text-[#61707A]">No reports generated yet.</p>}
    </DashboardLayout>
  );
}

export default withAuth(Reports, { role: 'ADMIN' });
