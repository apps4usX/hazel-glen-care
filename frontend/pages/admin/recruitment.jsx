import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Table, Row, Cell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import InputField from '../../components/forms/InputField';
import { Funnel } from '../../components/ui/Charts';
import { withAuth } from '../../lib/auth';
import { api } from '../../lib/api';

const STAGES = ['RECEIVED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED'];
const CARE_TYPES = ['NURSING_AGENCY', 'DEMENTIA_CARE', 'GENERAL_CARE', 'HOME_CARE'];
const EMP_TYPES = ['CASUAL', 'PART_TIME', 'FULL_TIME', 'CONTRACT'];
const nice = (s) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const FILTERS = ['', 'RECEIVED', 'SHORTLISTED', 'INTERVIEW', 'HIRED', 'REJECTED'];

function Recruitment() {
  const [apps, setApps] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('');
  const [creds, setCreds] = useState(null);
  const [showJob, setShowJob] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [{ applications }, jl] = await Promise.all([
        api.recruitment.applications(filter ? { status: filter } : undefined),
        api.recruitment.jobs().catch(() => ({ jobs: [] })),
      ]);
      setApps(applications); setJobs(jl.jobs || []);
    } catch (e) { setToast(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);
  function flash(m) { setToast(m); setTimeout(() => setToast(''), 3500); }

  async function screen(a) {
    setBusy(a.id + ':screen');
    try { const res = await api.recruitment.screen(a.id); setResult({ application: a, ...res }); flash(`Screened ${a.firstName} — ${res.score}/100 (${res.recommendation}).`); await load(); }
    catch (e) { flash(e.message); } finally { setBusy(null); }
  }
  async function setStatus(a, status) {
    setBusy(a.id + ':' + status);
    try { await api.recruitment.setStatus(a.id, status); flash(`${a.firstName} → ${status.toLowerCase()}`); await load(); }
    catch (e) { flash(e.message); } finally { setBusy(null); }
  }
  async function makeEmployee(a) {
    setBusy(a.id + ':convert');
    try { const { login } = await api.team.convertApplicant(a.id); setCreds(login); flash(`${a.firstName} is now an employee with a login.`); await load(); }
    catch (e) { flash(e.message); } finally { setBusy(null); }
  }

  const openJobs = jobs.filter((j) => j.status === 'OPEN').length;

  return (
    <DashboardLayout title="Recruitment" actions={<Button variant="primary" onClick={() => setShowJob(true)}>+ Post a job</Button>}>
      {toast && <div className="mb-4 rounded-xl bg-[#E4F0EC] text-[#2F7D71] px-4 py-2 text-sm">{toast}</div>}

      {showJob && <JobModal onClose={() => setShowJob(false)} onCreated={() => { setShowJob(false); flash('Job posted'); load(); }} onError={flash} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><div className="text-xs uppercase text-[#61707A] font-semibold">Applications</div><div className="text-3xl font-bold text-[#1F3D5C]">{apps.length}</div></Card>
        <Card><div className="text-xs uppercase text-[#61707A] font-semibold">Shortlisted</div><div className="text-3xl font-bold text-[#2f7d4e]">{apps.filter((a) => a.status === 'SHORTLISTED').length}</div></Card>
        <Card><div className="text-xs uppercase text-[#61707A] font-semibold">Hired</div><div className="text-3xl font-bold text-[#2F7D71]">{apps.filter((a) => a.status === 'HIRED').length}</div></Card>
        <Card><div className="text-xs uppercase text-[#61707A] font-semibold">Open jobs</div><div className="text-3xl font-bold text-[#B4893C]">{openJobs}</div></Card>
      </div>

      <Card className="mb-6">
        <h3 className="font-bold text-[#1F3D5C] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Hiring pipeline</h3>
        <Funnel data={STAGES.map((s) => ({ stage: s, count: apps.filter((a) => a.status === s).length }))} />
      </Card>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-[#61707A]">Filter:</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-[#1F3D5C]/15 bg-white px-3 py-2 text-sm">
          {FILTERS.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      <Table columns={['Applicant', 'Role', 'AI score', 'Status', 'Actions']}>
        {(loading ? [] : apps).map((a) => (
          <Row key={a.id}>
            <Cell><div className="font-medium text-[#1F3D5C]">{a.firstName} {a.lastName}</div><div className="text-xs text-[#61707A]">{a.email}</div></Cell>
            <Cell>{a.jobPost?.title || '—'}</Cell>
            <Cell>{a.aiScore != null ? <b className="text-[#2F7D71]">{a.aiScore}</b> : <span className="text-[#61707A]">—</span>}</Cell>
            <Cell><Badge status={a.status} /></Cell>
            <Cell>
              <div className="flex gap-1.5 flex-wrap">
                <Button variant="ghost" loading={busy === a.id + ':screen'} onClick={() => screen(a)}>Screen</Button>
                <Button variant="primary" loading={busy === a.id + ':SHORTLISTED'} onClick={() => setStatus(a, 'SHORTLISTED')}>Shortlist</Button>
                <Button variant="navy" loading={busy === a.id + ':HIRED'} onClick={() => setStatus(a, 'HIRED')}>Hire</Button>
                {a.hiredStaffId
                  ? <span className="text-xs text-[#2F7D71] self-center px-1">✓ Employee</span>
                  : <Button variant="primary" loading={busy === a.id + ':convert'} onClick={() => makeEmployee(a)}>Make employee</Button>}
                <Button variant="ghost" loading={busy === a.id + ':REJECTED'} onClick={() => setStatus(a, 'REJECTED')}>Reject</Button>
              </div>
            </Cell>
          </Row>
        ))}
      </Table>
      {!loading && apps.length === 0 && <p className="mt-4 text-sm text-[#61707A]">No applications match this filter.</p>}

      {creds && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center z-30 p-4" onClick={() => setCreds(null)}>
          <div className="bg-white w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-[#1F3D5C] text-lg mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Employee login created</h3>
            <p className="text-sm text-[#61707A] mb-3">Share these once. Ask them to change the password after their first sign-in.</p>
            <div className="rounded-xl bg-[#F5EEE2] p-4 text-sm space-y-1">
              <div><span className="text-[#61707A]">Email:</span> <b className="text-[#1F3D5C]">{creds.email}</b></div>
              <div><span className="text-[#61707A]">Password:</span> <b className="text-[#1F3D5C] font-mono">{creds.password}</b></div>
            </div>
            <div className="flex justify-end mt-4"><Button variant="primary" onClick={() => setCreds(null)}>Done</Button></div>
          </div>
        </div>
      )}

      {result && (
        <Card className="mt-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>{result.application.firstName} {result.application.lastName}</h3>
              <p className="text-sm text-[#61707A] mt-1 max-w-2xl">{result.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {(result.hits?.qualification || []).map((h) => <span key={h} className="rounded-full bg-[#E4F0EC] text-[#2F7D71] px-2 py-0.5">{h}</span>)}
                {(result.flags || []).map((f) => <span key={f} className="rounded-full bg-[#FBE7E5] text-[#b23b30] px-2 py-0.5">{f}</span>)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#2F7D71]" style={{ fontFamily: 'Poppins, sans-serif' }}>{result.score}</div>
              <Badge tone={result.recommendation === 'SHORTLIST' ? 'green' : result.recommendation === 'REVIEW' ? 'gold' : 'muted'}>{result.recommendation}</Badge>
            </div>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}

function JobModal({ onClose, onCreated, onError }) {
  const [f, setF] = useState({ title: '', careType: CARE_TYPES[0], employmentType: 'CASUAL', location: '', city: 'Boksburg', province: 'Gauteng', openingsCount: 1, description: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.recruitment.createJob({
        title: f.title, careType: f.careType, description: f.description,
        employmentType: f.employmentType, location: f.location || undefined,
        city: f.city || undefined, province: f.province || undefined,
        openingsCount: Number(f.openingsCount) || 1, status: 'OPEN',
      });
      onCreated();
    } catch (err) { onError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-30 p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#1F3D5C] text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>Post a job</h3>
          <button onClick={onClose} className="text-[#61707A]">✕</button>
        </div>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
          <InputField className="sm:col-span-2" label="Job title" value={f.title} onChange={set('title')} placeholder="Registered Nurse — frail care" required />
          <label className="block">
            <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Care type</span>
            <select value={f.careType} onChange={set('careType')} className="w-full rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm">
              {CARE_TYPES.map((c) => <option key={c} value={c}>{nice(c)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Employment</span>
            <select value={f.employmentType} onChange={set('employmentType')} className="w-full rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm">
              {EMP_TYPES.map((t) => <option key={t} value={t}>{nice(t)}</option>)}
            </select>
          </label>
          <InputField label="City / area" value={f.city} onChange={set('city')} />
          <InputField label="Openings" type="number" value={f.openingsCount} onChange={set('openingsCount')} />
          <InputField className="sm:col-span-2" label="Location (optional)" value={f.location} onChange={set('location')} placeholder="Sunrise Frail Care, Benoni" />
          <label className="block sm:col-span-2">
            <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Description</span>
            <textarea value={f.description} onChange={set('description')} rows={4} required
              className="w-full rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm" placeholder="Role, shifts, requirements (SANC, experience), what you offer…" />
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" loading={busy}>Publish job</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default withAuth(Recruitment, { role: 'ADMIN' });
