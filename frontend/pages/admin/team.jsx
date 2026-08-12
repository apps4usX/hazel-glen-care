import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Table, Row, Cell } from '../../components/ui/Table';
import InputField from '../../components/forms/InputField';
import { withAuth } from '../../lib/auth';
import { api, mediaUrl } from '../../lib/api';

const EMP_TYPES = ['CASUAL', 'PART_TIME', 'FULL_TIME', 'CONTRACT'];
const ROLES = ['Registered Nurse', 'Enrolled Nurse', 'Senior Carer', 'Carer', 'Home-based Carer'];

function Avatar({ src, name }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return src
    ? <img src={mediaUrl(src)} alt={name} className="h-9 w-9 rounded-full object-cover border border-[#1F3D5C]/10" />
    : <span className="h-9 w-9 rounded-full grid place-items-center bg-[#E4F0EC] text-[#2F7D71] text-xs font-bold">{initials}</span>;
}

function Team() {
  const [data, setData] = useState({ staff: [], admins: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null); // 'employee' | 'admin'
  const [creds, setCreds] = useState(null); // { email, password } to show once

  async function load() {
    setLoading(true);
    try { setData(await api.team.list()); }
    catch (e) { flash(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  function flash(m) { setToast(m); setTimeout(() => setToast(''), 4000); }

  return (
    <DashboardLayout title="Team" actions={
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setModal('admin')}>+ Coordinator / Admin</Button>
        <Button variant="primary" onClick={() => setModal('employee')}>+ Add employee</Button>
      </div>
    }>
      {toast && <div className="mb-4 rounded-xl bg-[#E4F0EC] text-[#2F7D71] px-4 py-2 text-sm">{toast}</div>}

      <h2 className="font-bold text-[#1F3D5C] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Carers &amp; nurses</h2>
      <Table columns={['', 'Name', 'Role', 'Contact', 'Skills', 'Status', 'Shifts']}>
        {(loading ? [] : data.staff).map((s) => (
          <Row key={s.id}>
            <Cell><Avatar src={s.photoUrl} name={`${s.firstName} ${s.lastName}`} /></Cell>
            <Cell className="font-medium text-[#1F3D5C]">{s.firstName} {s.lastName}<div className="text-xs text-[#61707A]">{s.user?.email}</div></Cell>
            <Cell>{s.jobTitle || '—'}<div className="text-[11px] text-[#61707A]">{s.employmentType?.replace('_', ' ').toLowerCase()}</div></Cell>
            <Cell>{s.phone || '—'}<div className="text-[11px] text-[#61707A]">{s.city || ''}</div></Cell>
            <Cell><span className="text-xs">{s.skills?.map((k) => k.name).join(', ') || '—'}</span></Cell>
            <Cell><Badge status={s.status} /></Cell>
            <Cell>{s._count?.assignments ?? 0}</Cell>
          </Row>
        ))}
      </Table>
      {!loading && data.staff.length === 0 && <p className="mt-3 text-sm text-[#61707A]">No employees yet — add your first with “Add employee”.</p>}

      <h2 className="font-bold text-[#1F3D5C] mt-8 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Admins &amp; coordinators</h2>
      <Table columns={['Email', 'Role', 'Last sign-in', 'Status']}>
        {(loading ? [] : data.admins).map((a) => (
          <Row key={a.id}>
            <Cell className="font-medium text-[#1F3D5C]">{a.email}</Cell>
            <Cell>Admin</Cell>
            <Cell>{a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}</Cell>
            <Cell><Badge status={a.isActive ? 'ACTIVE' : 'INACTIVE'} /></Cell>
          </Row>
        ))}
      </Table>

      {modal === 'employee' && (
        <EmployeeModal
          onClose={() => setModal(null)}
          onCreated={(login) => { setModal(null); setCreds(login); flash('Employee added'); load(); }}
          onError={flash}
        />
      )}
      {modal === 'admin' && (
        <AdminModal
          onClose={() => setModal(null)}
          onCreated={(login) => { setModal(null); setCreds(login); flash('Admin added'); load(); }}
          onError={flash}
        />
      )}
      {creds && <CredsModal creds={creds} onClose={() => setCreds(null)} />}
    </DashboardLayout>
  );
}

function fileToDataUrl(file, cb) {
  const r = new FileReader();
  r.onload = () => cb(r.result);
  r.readAsDataURL(file);
}

function EmployeeModal({ onClose, onCreated, onError }) {
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', phone: '', jobTitle: ROLES[0], employmentType: 'CASUAL', hourlyRate: '', city: '', skills: '', password: '' });
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...f,
        hourlyRate: f.hourlyRate || undefined,
        password: f.password || undefined,
        photo: photo || undefined,
        skills: f.skills.split(',').map((s) => s.trim()).filter(Boolean).map((name) => ({ name, level: 'INTERMEDIATE' })),
      };
      const { login } = await api.team.createStaff(payload);
      onCreated(login);
    } catch (err) { onError(err.message); } finally { setBusy(false); }
  }

  return (
    <Modal title="Add employee" onClose={onClose}>
      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 flex items-center gap-3">
          {photo ? <img src={photo} alt="" className="h-16 w-16 rounded-full object-cover" />
                 : <span className="h-16 w-16 rounded-full bg-[#E4F0EC] grid place-items-center text-[#2F7D71] text-xs">Photo</span>}
          <label className="text-sm">
            <span className="inline-block rounded-lg border-2 border-[#1F3D5C] text-[#1F3D5C] font-semibold px-3 py-1.5 cursor-pointer hover:bg-[#1F3D5C] hover:text-white">Upload photo (optional)</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && fileToDataUrl(e.target.files[0], setPhoto)} />
          </label>
        </div>
        <InputField label="First name" value={f.firstName} onChange={set('firstName')} required />
        <InputField label="Last name" value={f.lastName} onChange={set('lastName')} required />
        <InputField label="Email (their login)" type="email" value={f.email} onChange={set('email')} required />
        <InputField label="Phone" value={f.phone} onChange={set('phone')} />
        <label className="block">
          <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Role</span>
          <select value={f.jobTitle} onChange={set('jobTitle')} className="w-full rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm">
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Employment</span>
          <select value={f.employmentType} onChange={set('employmentType')} className="w-full rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm">
            {EMP_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ').toLowerCase()}</option>)}
          </select>
        </label>
        <InputField label="Hourly rate (R)" type="number" value={f.hourlyRate} onChange={set('hourlyRate')} />
        <InputField label="City / area" value={f.city} onChange={set('city')} />
        <InputField className="sm:col-span-2" label="Skills (comma separated)" value={f.skills} onChange={set('skills')} placeholder="Wound Care, Dementia Care" />
        <InputField className="sm:col-span-2" label="Temporary password (optional — auto-generated if blank)" value={f.password} onChange={set('password')} />
        <div className="sm:col-span-2 flex justify-end gap-2 mt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={busy}>Create employee</Button>
        </div>
      </form>
    </Modal>
  );
}

function AdminModal({ onClose, onCreated, onError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try { const { login } = await api.team.createAdmin({ email, password: password || undefined }); onCreated(login); }
    catch (err) { onError(err.message); } finally { setBusy(false); }
  }
  return (
    <Modal title="Add coordinator / admin" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-[#61707A]">They'll get full admin access to scheduling, timesheets, compliance and finance.</p>
        <InputField label="Email (their login)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <InputField label="Temporary password (optional)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="navy" loading={busy}>Create admin</Button>
        </div>
      </form>
    </Modal>
  );
}

function CredsModal({ creds, onClose }) {
  return (
    <Modal title="Login created" onClose={onClose}>
      <p className="text-sm text-[#61707A] mb-3">Share these once. Ask them to change the password after their first sign-in.</p>
      <div className="rounded-xl bg-[#F5EEE2] p-4 text-sm space-y-1">
        <div><span className="text-[#61707A]">Email:</span> <b className="text-[#1F3D5C]">{creds.email}</b></div>
        <div><span className="text-[#61707A]">Password:</span> <b className="text-[#1F3D5C] font-mono">{creds.password}</b></div>
      </div>
      <div className="flex justify-end mt-4"><Button variant="primary" onClick={onClose}>Done</Button></div>
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-30 p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#1F3D5C] text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</h3>
          <button onClick={onClose} className="text-[#61707A]">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default withAuth(Team, { role: 'ADMIN' });
