/* eslint-disable no-console */
// Seed rich demo data for Hazel Glen Care.
// Re-runnable: it RESETS the demo tables first, then rebuilds a realistic
// dataset (history + upcoming) so every admin page shows meaningful numbers.
//   node prisma/seed.js   (or: npm run db:seed)

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Password123!';
const day = 86_400_000;
const hoursBetween = (a, b, brk = 0) => Math.max(0, Math.round(((b - a) / 3_600_000 - brk / 60) * 100) / 100);

async function reset() {
  // delete children -> parents to respect FKs
  await prisma.aIRecommendation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.report.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.applicationDocument.deleteMany();
  await prisma.application.deleteMany();
  await prisma.jobPost.deleteMany();
  await prisma.staffTimesheet.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.shiftRequest.deleteMany();
  await prisma.staffDocument.deleteMany();
  await prisma.staffSkill.deleteMany();
  await prisma.staffAvailability.deleteMany();
  await prisma.clientPortalUser.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log('Resetting demo data…');
  await reset();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const admin = await prisma.user.create({ data: { email: 'admin@hazelglencare.co.za', passwordHash, role: 'ADMIN' } });

  // clients ---------------------------------------------------------------
  const smith = await prisma.client.create({ data: {
    name: 'Smith Family', type: 'INDIVIDUAL', contactName: 'Margaret Smith', email: 'smith@example.co.za',
    phone: '+27 11 000 0001', addressLine1: '14 Rose Street', city: 'Boksburg', province: 'Gauteng', postalCode: '1459',
    latitude: -26.212, longitude: 28.262 } });
  const sunrise = await prisma.client.create({ data: {
    name: 'Sunrise Frail Care', type: 'FACILITY', contactName: 'Johan van der Merwe', email: 'admin@sunrisecare.co.za',
    phone: '+27 11 000 0002', addressLine1: '5 Trichardts Road', city: 'Benoni', province: 'Gauteng', postalCode: '1501',
    latitude: -26.188, longitude: 28.320, billingEmail: 'accounts@sunrisecare.co.za', vatNumber: '4123456789' } });

  await prisma.user.create({ data: { email: 'client@example.co.za', passwordHash, role: 'CLIENT',
    clientPortalUser: { create: { clientId: sunrise.id, firstName: 'Johan', lastName: 'van der Merwe', jobTitle: 'Care Manager', isPrimary: true } } } });

  // staff -----------------------------------------------------------------
  const staffSeed = [
    { email: 'thandi@hazelglencare.co.za', firstName: 'Thandi', lastName: 'Nkosi', jobTitle: 'Registered Nurse', city: 'Boksburg', lat: -26.215, lng: 28.259, rating: 4.8, rate: 220, skills: [['Wound Care', 'ADVANCED'], ['Dementia Care', 'INTERMEDIATE']] },
    { email: 'riaan@hazelglencare.co.za', firstName: 'Riaan', lastName: 'van der Merwe', jobTitle: 'Enrolled Nurse', city: 'Benoni', lat: -26.190, lng: 28.318, rating: 4.5, rate: 180, skills: [['General Care', 'ADVANCED']] },
    { email: 'aisha@hazelglencare.co.za', firstName: 'Aisha', lastName: 'Patel', jobTitle: 'Senior Carer', city: 'Kempton Park', lat: -26.100, lng: 28.234, rating: 4.9, rate: 170, skills: [['Dementia Care', 'EXPERT'], ['Palliative', 'INTERMEDIATE']], sancExpiresInDays: 15 },
    { email: 'lerato@hazelglencare.co.za', firstName: 'Lerato', lastName: 'Dlamini', jobTitle: 'Carer', city: 'Boksburg', lat: -26.219, lng: 28.268, rating: 4.2, rate: 150, skills: [['General Care', 'INTERMEDIATE'], ['Home Care', 'ADVANCED']] },
  ];
  const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const staff = [];
  for (const s of staffSeed) {
    const u = await prisma.user.create({ data: { email: s.email, passwordHash, role: 'STAFF',
      staff: { create: {
        firstName: s.firstName, lastName: s.lastName, jobTitle: s.jobTitle, status: 'ACTIVE', employmentType: 'CASUAL',
        hourlyRate: s.rate, rating: s.rating, city: s.city, province: 'Gauteng', latitude: s.lat, longitude: s.lng,
        hiredAt: new Date(Date.now() - 200 * day),
        skills: { create: s.skills.map(([name, level]) => ({ name, level })) },
        availability: { create: weekdays.map((d) => ({ dayOfWeek: d, startTime: '06:00', endTime: '18:00' })) },
      } } }, include: { staff: true } });
    const staffId = u.staff.id;
    await prisma.staffDocument.createMany({ data: [
      { staffId, type: 'ID_DOCUMENT', name: 'SA ID', fileUrl: 'https://files.example/id.pdf', status: 'VERIFIED', verifiedById: admin.id, verifiedAt: new Date() },
      { staffId, type: 'SANC_REGISTRATION', name: 'SANC certificate', fileUrl: 'https://files.example/sanc.pdf', status: 'VERIFIED', verifiedById: admin.id, verifiedAt: new Date(), expiresAt: new Date(Date.now() + (s.sancExpiresInDays || 400) * day) },
      { staffId, type: 'POLICE_CLEARANCE', name: 'Police clearance', fileUrl: 'https://files.example/police.pdf', status: 'VERIFIED', verifiedById: admin.id, verifiedAt: new Date(), expiresAt: new Date(Date.now() + 300 * day) },
    ] });
    staff.push({ ...u.staff });
  }

  // helper to build a completed shift + assignment + approved timesheet ----
  async function completedShift({ client, title, careType, daysAgo, startHour, hours, staffMember, pay, charge }) {
    const start = new Date(); start.setDate(start.getDate() - daysAgo); start.setHours(startHour, 0, 0, 0);
    const end = new Date(start.getTime() + hours * 3_600_000);
    const shift = await prisma.shift.create({ data: {
      clientId: client.id, title, careType, status: 'COMPLETED',
      location: client.name, city: client.city, province: 'Gauteng', latitude: client.latitude, longitude: client.longitude,
      startAt: start, endAt: end, headcount: 1, payRate: pay, chargeRate: charge, createdById: admin.id } });
    const assignment = await prisma.shiftAssignment.create({ data: {
      shiftId: shift.id, staffId: staffMember.id, status: 'COMPLETED', matchScore: 80 + Math.round(hours),
      offeredAt: new Date(start.getTime() - 2 * day), respondedAt: new Date(start.getTime() - 2 * day),
      confirmedAt: new Date(start.getTime() - day), checkInAt: start, checkOutAt: end, clientRating: 5 } });
    await prisma.staffTimesheet.create({ data: {
      staffId: staffMember.id, shiftAssignmentId: assignment.id, workDate: start, startTime: start, endTime: end,
      breakMinutes: 30, hoursWorked: hoursBetween(start, end, 30), status: 'APPROVED', submittedAt: end,
      approvedById: admin.id, approvedAt: new Date(end.getTime() + day) } });
    return shift;
  }

  // ~3 weeks of history across both clients --------------------------------
  const history = [
    { client: sunrise, title: 'Day shift — RN cover', careType: 'NURSING_AGENCY', daysAgo: 21, startHour: 7, hours: 12, staffMember: staff[0], pay: 220, charge: 340 },
    { client: sunrise, title: 'Day shift — RN cover', careType: 'NURSING_AGENCY', daysAgo: 18, startHour: 7, hours: 12, staffMember: staff[1], pay: 180, charge: 300 },
    { client: smith, title: 'Dementia support — home', careType: 'DEMENTIA_CARE', daysAgo: 16, startHour: 8, hours: 6, staffMember: staff[2], pay: 170, charge: 300 },
    { client: smith, title: 'Home care visit', careType: 'HOME_CARE', daysAgo: 14, startHour: 9, hours: 5, staffMember: staff[3], pay: 150, charge: 270 },
    { client: sunrise, title: 'Night shift — RN cover', careType: 'NURSING_AGENCY', daysAgo: 12, startHour: 19, hours: 12, staffMember: staff[0], pay: 240, charge: 360 },
    { client: sunrise, title: 'Day shift — carer', careType: 'GENERAL_CARE', daysAgo: 9, startHour: 7, hours: 10, staffMember: staff[3], pay: 150, charge: 270 },
    { client: smith, title: 'Dementia support — home', careType: 'DEMENTIA_CARE', daysAgo: 6, startHour: 8, hours: 6, staffMember: staff[2], pay: 170, charge: 300 },
    { client: sunrise, title: 'Day shift — RN cover', careType: 'NURSING_AGENCY', daysAgo: 3, startHour: 7, hours: 12, staffMember: staff[1], pay: 180, charge: 300 },
  ];
  for (const h of history) await completedShift(h);

  // upcoming shifts (open) -------------------------------------------------
  const at = (d, hr) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(hr, 0, 0, 0); return x; };
  await prisma.shift.create({ data: { clientId: sunrise.id, title: 'Day shift — RN cover', careType: 'NURSING_AGENCY', status: 'OPEN', location: 'Sunrise Frail Care, Benoni', city: 'Benoni', province: 'Gauteng', latitude: -26.188, longitude: 28.320, startAt: at(3, 7), endAt: at(3, 19), headcount: 1, requiredSkill: 'Wound Care', payRate: 220, chargeRate: 340, createdById: admin.id } });
  await prisma.shift.create({ data: { clientId: smith.id, title: 'Dementia support — home visit', careType: 'DEMENTIA_CARE', status: 'OPEN', location: '14 Rose Street, Boksburg', city: 'Boksburg', province: 'Gauteng', latitude: -26.212, longitude: 28.262, startAt: at(2, 8), endAt: at(2, 14), headcount: 1, requiredSkill: 'Dementia Care', payRate: 180, chargeRate: 300, createdById: admin.id } });
  await prisma.shift.create({ data: { clientId: smith.id, title: 'URGENT — overnight general care', careType: 'GENERAL_CARE', status: 'OPEN', location: '14 Rose Street, Boksburg', city: 'Boksburg', province: 'Gauteng', latitude: -26.212, longitude: 28.262, startAt: at(1, 19), endAt: at(2, 7), headcount: 1, isEmergency: true, payRate: 200, chargeRate: 330, createdById: admin.id } });

  // a pending client request ----------------------------------------------
  const cpu = await prisma.clientPortalUser.findFirst({ where: { clientId: sunrise.id } });
  await prisma.shiftRequest.create({ data: { clientId: sunrise.id, requestedById: cpu?.id, careType: 'NURSING_AGENCY', title: 'Weekend RN cover', startAt: at(5, 7), endAt: at(5, 19), headcount: 2, status: 'PENDING', notes: 'Two RNs needed for the weekend.' } });

  // recruitment ------------------------------------------------------------
  const job = await prisma.jobPost.create({ data: { title: 'Registered Nurse — Boksburg', slug: 'registered-nurse-boksburg', careType: 'NURSING_AGENCY', description: 'We are seeking a compassionate Registered Nurse for frail care and home visits across the East Rand.', city: 'Boksburg', province: 'Gauteng', employmentType: 'CASUAL', status: 'OPEN', salaryMin: 180, salaryMax: 250, openingsCount: 2 } });
  const job2 = await prisma.jobPost.create({ data: { title: 'Dementia Carer — East Rand', slug: 'dementia-carer-east-rand', careType: 'DEMENTIA_CARE', description: 'Patient, experienced carer for dementia support in clients’ homes.', city: 'Benoni', province: 'Gauteng', employmentType: 'PART_TIME', status: 'OPEN', salaryMin: 150, salaryMax: 200, openingsCount: 1 } });
  await prisma.application.createMany({ data: [
    { jobPostId: job.id, firstName: 'Nomsa', lastName: 'Mahlangu', email: 'nomsa@example.co.za', phone: '+27 82 000 0001', coverLetter: 'Registered nurse with SANC registration and 8 years experience in frail care and dementia. Compassionate, reliable and punctual. First aid and CPR certified.', status: 'SHORTLISTED', aiScore: 82, aiSummary: 'Strong RN with SANC + dementia experience. Recommend shortlist.', source: 'website' },
    { jobPostId: job.id, firstName: 'Peter', lastName: 'Botha', email: 'peter@example.co.za', phone: '+27 82 000 0002', coverLetter: 'Looking for care work. Some experience helping family members.', status: 'RECEIVED', source: 'website' },
    { jobPostId: job2.id, firstName: 'Fatima', lastName: 'Adams', email: 'fatima@example.co.za', phone: '+27 82 000 0003', coverLetter: 'Experienced dementia carer, 5 years, palliative and chronic care. Patient and reliable.', status: 'INTERVIEW', aiScore: 74, source: 'referral' },
    { jobPostId: job.id, firstName: 'Sipho', lastName: 'Khumalo', email: 'sipho@example.co.za', phone: '+27 82 000 0004', coverLetter: 'Enrolled nurse, wound care and general care experience in hospital settings.', status: 'HIRED', aiScore: 78, source: 'website' },
  ] });

  const invCount = await prisma.staffTimesheet.count();
  console.log('✅ Seed complete');
  console.log(`   Logins (password ${DEMO_PASSWORD}):`);
  console.log('     admin@hazelglencare.co.za   (admin)');
  console.log('     client@example.co.za        (client portal)');
  console.log('     thandi@ / riaan@ / aisha@ / lerato@ hazelglencare.co.za  (staff)');
  console.log(`   Data: 2 clients, ${staff.length} staff, ${history.length} completed shifts + 3 upcoming, ${invCount} approved timesheets, 2 jobs + 4 applications, 1 pending request`);
  console.log('   Aisha’s SANC expires in 15 days (Compliance scan will flag it).');
  console.log('   Try Finance → Generate invoice (Sunrise / last 30 days) to bill the completed shifts.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
