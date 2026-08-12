import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { StatCard } from '../../components/ui/Card';
import Card from '../../components/ui/Card';
import { Table, Row, Cell } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { Donut, Area, GroupedBars, Funnel, Legend, PALETTE } from '../../components/ui/Charts';
import { withAuth } from '../../lib/auth';
import { api } from '../../lib/api';

function fmt(dt) { return new Date(dt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }); }
function money(v) { return `R ${Number(v).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`; }

function Panel({ title, link, linkLabel, children, right }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</h3>
        {right || (link && <Link href={link} className="text-xs font-semibold text-[#2F7D71]">{linkLabel || 'Open'} →</Link>)}
      </div>
      {children}
    </Card>
  );
}

function Dashboard() {
  const [d, setD] = useState({ shifts: [], staff: [], apps: [], invoices: [] });
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [shifts, staff, apps, invoices, metrics] = await Promise.all([
          api.shifts.list().then((r) => r.shifts),
          api.directory.staff().then((r) => r.staff).catch(() => []),
          api.recruitment.applications().then((r) => r.applications).catch(() => []),
          api.invoices.list().then((r) => r.invoices).catch(() => []),
          api.metrics.dashboard().catch(() => null),
        ]);
        setD({ shifts, staff, apps, invoices }); setM(metrics);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const { shifts, staff, apps, invoices } = d;
  const open = shifts.filter((s) => ['OPEN', 'PARTIALLY_FILLED'].includes(s.status)).length;
  const filled = shifts.filter((s) => ['FILLED', 'COMPLETED'].includes(s.status)).length;
  const fillRate = m?.shifts?.fillRatePct ?? (shifts.length ? Math.round((filled / shifts.length) * 100) : 0);
  const activeStaff = staff.filter((s) => s.status === 'ACTIVE').length;
  const nonCompliant = staff.filter((s) => !s.compliant);
  const expiring = staff.filter((s) => s.expiringSoon > 0);
  const pendingApps = apps.filter((a) => ['RECEIVED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW'].includes(a.status)).length;
  const outstanding = m?.finance?.outstanding ?? invoices.filter((i) => !['PAID', 'VOID'].includes(i.status)).reduce((a, i) => a + (Number(i.total) - Number(i.amountPaid)), 0);
  const upcoming = shifts.filter((s) => new Date(s.startAt) >= new Date() && s.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt)).slice(0, 6);

  const complianceData = m && [
    { label: 'Compliant', value: m.compliance.compliant, color: PALETTE.green },
    { label: 'Expiring', value: m.compliance.expiringSoon, color: PALETTE.gold },
    { label: 'Expired', value: m.compliance.expired, color: PALETTE.red },
    { label: 'Pending', value: m.compliance.pending, color: PALETTE.muted },
  ].filter((x) => x.value > 0);

  const attendanceData = m && [
    { label: 'Approved', value: m.attendance.byStatus.APPROVED || 0, color: PALETTE.green },
    { label: 'Submitted', value: m.attendance.byStatus.SUBMITTED || 0, color: PALETTE.gold },
    { label: 'Paid', value: m.attendance.byStatus.PAID || 0, color: PALETTE.navy },
    { label: 'Rejected', value: m.attendance.byStatus.REJECTED || 0, color: PALETTE.red },
  ].filter((x) => x.value > 0);

  return (
    <DashboardLayout title="Dashboard">
      {error && <p className="mb-4 text-sm text-[#b23b30]">Couldn’t load data: {error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard label="Active staff" value={loading ? '—' : activeStaff} hint={`${staff.length} on books`} />
        <StatCard label="Open shifts" value={loading ? '—' : open} hint="Awaiting cover" accent="#B4893C" />
        <StatCard label="Fill rate" value={loading ? '—' : `${fillRate}%`} accent="#2f7d4e" />
        <StatCard label="Applications" value={loading ? '—' : pendingApps} hint="In pipeline" />
        <StatCard label="Compliance" value={loading ? '—' : (nonCompliant.length + expiring.length)} hint="Need attention" accent="#C0453B" />
        <StatCard label="Outstanding" value={loading ? '—' : money(outstanding)} hint="Unpaid invoices" accent="#B4893C" />
      </div>

      {/* PERFORMANCE CHARTS */}
      <h2 className="font-bold text-[#1F3D5C] mb-3 mt-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Performance by sector</h2>
      {!m && !loading && <p className="text-sm text-[#61707A] mb-4">Performance metrics unavailable.</p>}
      {m && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          <Panel title="Scheduling — filled vs open" link="/admin/shifts" linkLabel="Shifts">
            <GroupedBars data={m.shifts.byWeek} colors={{ a: PALETTE.teal, b: PALETTE.gold }} />
            <Legend items={[{ label: 'Filled', color: PALETTE.teal }, { label: 'Open', color: PALETTE.gold }]} />
            <p className="mt-2 text-xs text-[#61707A]">Fill rate <b className="text-[#1F3D5C]">{m.shifts.fillRatePct}%</b> · {m.shifts.filled}/{m.shifts.total} shifts covered</p>
          </Panel>

          <Panel title="Timesheets — hours / week" link="/admin/timesheets" linkLabel="Timesheets">
            <Area points={m.hours.byWeek} color={PALETTE.navy} suffix="h" />
            <p className="mt-2 text-xs text-[#61707A]">{m.hours.total}h logged over 6 weeks</p>
          </Panel>

          <Panel title="Attendance verification" link="/admin/timesheets" linkLabel="Review">
            {attendanceData?.length
              ? <Donut data={attendanceData} centerLabel={`${m.attendance.verifiedPct}%`} centerSub="verified" />
              : <p className="text-sm text-[#61707A]">No attendance yet.</p>}
            <p className="mt-2 text-xs text-[#61707A]">{m.attendance.clockedIn} clock-ins · {m.attendance.verifiedPct}% with photo + GPS</p>
          </Panel>

          <Panel title="Compliance status" link="/admin/compliance" linkLabel="Compliance">
            {complianceData?.length
              ? <Donut data={complianceData} centerLabel={m.compliance.compliant} centerSub="current" />
              : <p className="text-sm text-[#61707A]">No documents tracked.</p>}
          </Panel>

          <Panel title="Recruitment funnel" link="/admin/recruitment" linkLabel="Recruitment">
            <Funnel data={m.recruitment.funnel} />
            <p className="mt-2 text-xs text-[#61707A]">{m.recruitment.total} applicants · {m.recruitment.hired} hired</p>
          </Panel>

          <Panel title="Finance — revenue / month" link="/admin/finance" linkLabel="Finance">
            <Area points={m.finance.revenueByMonth.map((r) => ({ label: r.label, value: Math.round(r.amount / 1000) }))} color={PALETTE.gold} suffix="k" />
            <div className="mt-2 flex gap-4 text-xs text-[#61707A]">
              <span>Paid <b className="text-[#2f7d4e]">{money(m.finance.paid)}</b></span>
              <span>Outstanding <b className="text-[#B4893C]">{money(m.finance.outstanding)}</b></span>
            </div>
          </Panel>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Upcoming shifts</h2>
            <Link href="/admin/shifts" className="text-sm font-semibold text-[#2F7D71]">View all →</Link>
          </div>
          <Table columns={['Shift', 'Client', 'When', 'Status']}>
            {(loading ? [] : upcoming).map((s) => (
              <Row key={s.id}>
                <Cell className="font-medium text-[#1F3D5C]">{s.title}{s.isEmergency && ' 🚨'}</Cell>
                <Cell>{s.client?.name}</Cell>
                <Cell className="whitespace-nowrap">{fmt(s.startAt)}</Cell>
                <Cell><Badge status={s.status} /></Cell>
              </Row>
            ))}
          </Table>
          {!loading && upcoming.length === 0 && <p className="mt-3 text-sm text-[#61707A]">No upcoming shifts.</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#1F3D5C]" style={{ fontFamily: 'Poppins, sans-serif' }}>Needs attention</h2>
            <Link href="/admin/compliance" className="text-sm font-semibold text-[#2F7D71]">Compliance →</Link>
          </div>
          <Card>
            {loading && <p className="text-sm text-[#61707A]">Loading…</p>}
            {!loading && nonCompliant.length === 0 && expiring.length === 0 && (
              <p className="text-sm text-[#61707A]">Everyone’s compliant and current. 🎉</p>
            )}
            {!loading && [...nonCompliant, ...expiring.filter((e) => e.compliant)].slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-[#1F3D5C]/5 last:border-0">
                <div>
                  <div className="text-sm font-semibold text-[#1F3D5C]">{s.name}</div>
                  <div className="text-xs text-[#61707A]">{s.jobTitle}</div>
                </div>
                {!s.compliant
                  ? <Badge tone="red">Not compliant</Badge>
                  : <Badge tone="gold">{s.nextExpiry ? `${s.nextExpiry.daysLeft}d left` : 'Expiring'}</Badge>}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAuth(Dashboard, { role: 'ADMIN' });
