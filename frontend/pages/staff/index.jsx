import { useEffect, useState } from 'react';
import PortalLayout from '../../components/layout/PortalLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Table, Row, Cell } from '../../components/ui/Table';
import InputField from '../../components/forms/InputField';
import SelfieCapture from '../../components/SelfieCapture';
import { withAuth } from '../../lib/auth';
import { api, mediaUrl } from '../../lib/api';

function fmt(dt) { return new Date(dt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }); }

function StaffPortal() {
  const [staff, setStaff] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState('');
  const [ts, setTs] = useState({ shiftAssignmentId: '', workDate: '', startTime: '', endTime: '', breakMinutes: 30 });
  const [capture, setCapture] = useState(null); // { mode:'in'|'out', assignment }

  async function load() {
    setLoading(true);
    try {
      const [{ staff }, { timesheets }] = await Promise.all([api.staff.me(), api.staff.timesheets()]);
      setStaff(staff); setTimesheets(timesheets);
    } catch (e) { setToast(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  function flash(m) { setToast(m); setTimeout(() => setToast(''), 3500); }

  async function respond(a, accept) {
    setBusy(a.id);
    try { await api.staff.respond(a.id, accept); flash(accept ? 'Shift accepted' : 'Shift declined'); await load(); }
    catch (e) { flash(e.message); } finally { setBusy(null); }
  }

  async function uploadPhoto(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = async () => {
      setBusy('photo');
      try { await api.staff.uploadPhoto(r.result); flash('Profile photo updated'); await load(); }
      catch (err) { flash(err.message); } finally { setBusy(null); }
    };
    r.readAsDataURL(file);
  }

  async function doClock({ lat, lng, photo, consent }) {
    const { mode, assignment } = capture;
    setCapture(null);
    setBusy(assignment.id);
    try {
      if (mode === 'in') { await api.staff.clockIn(assignment.id, { lat, lng, photo, consent }); flash('Clocked in ✓'); }
      else { const r = await api.staff.clockOut(assignment.id, { lat, lng, photo, consent }); flash(`Clocked out ✓ — ${r.hoursWorked}h logged`); }
      await load();
    } catch (e) { flash(e.message); } finally { setBusy(null); }
  }

  async function submitTimesheet(e) {
    e.preventDefault();
    setBusy('ts');
    try {
      await api.staff.submitTimesheet({
        shiftAssignmentId: ts.shiftAssignmentId || undefined,
        workDate: ts.workDate,
        startTime: `${ts.workDate}T${ts.startTime}`,
        endTime: `${ts.workDate}T${ts.endTime}`,
        breakMinutes: Number(ts.breakMinutes) || 0,
      });
      flash('Timesheet submitted');
      setTs({ shiftAssignmentId: '', workDate: '', startTime: '', endTime: '', breakMinutes: 30 });
      await load();
    } catch (err) { flash(err.message); } finally { setBusy(null); }
  }

  const assignments = staff?.assignments || [];
  const offers = assignments.filter((a) => a.status === 'OFFERED');
  const upcoming = assignments.filter((a) => ['ACCEPTED', 'CONFIRMED', 'CHECKED_IN'].includes(a.status));

  return (
    <PortalLayout title={staff ? `Welcome, ${staff.firstName}` : 'Staff Portal'} subtitle="STAFF PORTAL">
      {toast && <div className="mb-4 rounded-xl bg-[#E4F0EC] text-[#2F7D71] px-4 py-2 text-sm">{toast}</div>}
      {loading && <p className="text-[#61707A]">Loading…</p>}

      {staff && (
        <Card className="mb-6 flex items-center gap-4">
          {staff.photoUrl
            ? <img src={mediaUrl(staff.photoUrl)} alt="" className="h-16 w-16 rounded-full object-cover border border-[#1F3D5C]/10" />
            : <span className="h-16 w-16 rounded-full bg-[#E4F0EC] grid place-items-center text-[#2F7D71] font-bold">{staff.firstName?.[0]}{staff.lastName?.[0]}</span>}
          <div className="flex-1">
            <div className="font-bold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>{staff.firstName} {staff.lastName}</div>
            <div className="text-sm text-[#61707A]">{staff.jobTitle || 'Carer'}{staff.photoUrl ? '' : ' · a profile photo helps families recognise you'}</div>
          </div>
          <label className="text-sm">
            <span className="inline-block rounded-lg border-2 border-[#1F3D5C] text-[#1F3D5C] font-semibold px-3 py-1.5 cursor-pointer hover:bg-[#1F3D5C] hover:text-white">{staff.photoUrl ? 'Change photo' : 'Add photo'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={busy === 'photo'} />
          </label>
        </Card>
      )}

      {/* offers */}
      <h2 className="font-bold text-[#1F3D5C] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Shift offers</h2>
      {offers.length === 0 && !loading && <p className="text-sm text-[#61707A] mb-6">No open offers right now.</p>}
      <div className="space-y-3 mb-8">
        {offers.map((a) => (
          <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-[#1F3D5C]">{a.shift.title} {a.shift.isEmergency && '🚨'}</div>
              <div className="text-sm text-[#61707A]">{a.shift.client?.name} · {fmt(a.shift.startAt)} → {fmt(a.shift.endAt)}</div>
              {a.matchScore != null && <div className="text-xs text-[#2F7D71] mt-1">Match {a.matchScore}/100</div>}
            </div>
            <div className="flex gap-2">
              <Button variant="primary" loading={busy === a.id} onClick={() => respond(a, true)}>Accept</Button>
              <Button variant="outline" loading={busy === a.id} onClick={() => respond(a, false)}>Decline</Button>
            </div>
          </Card>
        ))}
      </div>

      {/* upcoming */}
      <h2 className="font-bold text-[#1F3D5C] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Upcoming shifts</h2>
      <Table columns={['Shift', 'Client', 'When', 'Status', 'Attendance']}>
        {upcoming.map((a) => (
          <Row key={a.id}>
            <Cell className="font-medium text-[#1F3D5C]">{a.shift.title}</Cell>
            <Cell>{a.shift.client?.name}</Cell>
            <Cell className="whitespace-nowrap">{fmt(a.shift.startAt)}</Cell>
            <Cell><Badge status={a.status} /></Cell>
            <Cell>
              {['ACCEPTED', 'CONFIRMED'].includes(a.status) && (
                <Button variant="primary" loading={busy === a.id} onClick={() => setCapture({ mode: 'in', assignment: a })}>Clock in</Button>
              )}
              {a.status === 'CHECKED_IN' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#2F7D71]">In at {new Date(a.checkInAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span>
                  <Button variant="danger" loading={busy === a.id} onClick={() => setCapture({ mode: 'out', assignment: a })}>Clock out</Button>
                </div>
              )}
            </Cell>
          </Row>
        ))}
      </Table>
      {upcoming.length === 0 && !loading && <p className="text-sm text-[#61707A] mt-2">Nothing booked yet.</p>}

      {capture && (
        <SelfieCapture
          title={capture.mode === 'in' ? 'Clock in' : 'Clock out'}
          onCancel={() => setCapture(null)}
          onConfirm={doClock}
        />
      )}

      {/* timesheet */}
      <h2 className="font-bold text-[#1F3D5C] mt-8 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Submit a timesheet</h2>
      <Card>
        <form onSubmit={submitTimesheet} className="grid sm:grid-cols-2 gap-3 items-end">
          <label className="block sm:col-span-2">
            <span className="block mb-1 text-sm font-semibold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Against shift (optional)</span>
            <select value={ts.shiftAssignmentId} onChange={(e) => setTs({ ...ts, shiftAssignmentId: e.target.value })}
              className="w-full rounded-xl border border-[#1F3D5C]/15 bg-[#FDFCF9] px-3 py-2.5 text-sm">
              <option value="">— none —</option>
              {assignments.map((a) => <option key={a.id} value={a.id}>{a.shift.title} · {fmt(a.shift.startAt)}</option>)}
            </select>
          </label>
          <InputField label="Date" type="date" value={ts.workDate} onChange={(e) => setTs({ ...ts, workDate: e.target.value })} required />
          <InputField label="Break (mins)" type="number" value={ts.breakMinutes} onChange={(e) => setTs({ ...ts, breakMinutes: e.target.value })} />
          <InputField label="Start" type="time" value={ts.startTime} onChange={(e) => setTs({ ...ts, startTime: e.target.value })} required />
          <InputField label="End" type="time" value={ts.endTime} onChange={(e) => setTs({ ...ts, endTime: e.target.value })} required />
          <div className="sm:col-span-2"><Button type="submit" variant="navy" loading={busy === 'ts'}>Submit timesheet</Button></div>
        </form>
      </Card>

      <h2 className="font-bold text-[#1F3D5C] mt-8 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>My timesheets</h2>
      <Table columns={['Date', 'Hours', 'Status']}>
        {timesheets.map((t) => (
          <Row key={t.id}>
            <Cell>{new Date(t.workDate).toLocaleDateString('en-ZA')}</Cell>
            <Cell>{t.hoursWorked}</Cell>
            <Cell><Badge status={t.status} /></Cell>
          </Row>
        ))}
      </Table>
      {timesheets.length === 0 && !loading && <p className="text-sm text-[#61707A] mt-2">No timesheets yet.</p>}
    </PortalLayout>
  );
}

export default withAuth(StaffPortal, { role: 'STAFF' });
