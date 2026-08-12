// invoicing.service.js
// Turn a client's approved/submitted timesheets in a period into an invoice.
//   generateInvoice(clientId, { start, end })  -> Invoice with line items
//   setInvoiceStatus(invoiceId, status)        -> update status (+ paid tracking)
//
// Billing = hoursWorked × the shift's chargeRate, + 15% VAT (ZAR).
// De-duplicates by shift so the same shift is never billed twice per client.

const { prisma } = require('../config/db');
const { ApiError } = require('../utils/http');

const VAT_RATE = 15;
const round2 = (n) => Math.round(n * 100) / 100;

async function nextInvoiceNumber() {
  const count = await prisma.invoice.count();
  const year = new Date().getFullYear();
  return `HGC-${year}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Generate a draft invoice for a client from un-invoiced timesheets in a period.
 * @param {string} clientId
 * @param {{start:Date|string, end:Date|string}} period
 */
async function generateInvoice(clientId, period) {
  const gte = new Date(period.start);
  const lte = new Date(period.end);

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw ApiError.notFound('Client not found');

  const timesheets = await prisma.staffTimesheet.findMany({
    where: {
      status: { in: ['SUBMITTED', 'APPROVED'] },
      workDate: { gte, lte },
      shiftAssignment: { is: { shift: { is: { clientId } } } },
    },
    include: { shiftAssignment: { include: { shift: true } }, staff: true },
  });

  // Exclude shifts already billed to this client.
  const billed = await prisma.invoiceItem.findMany({
    where: { shiftId: { not: null }, invoice: { is: { clientId } } },
    select: { shiftId: true },
  });
  const billedShiftIds = new Set(billed.map((b) => b.shiftId));

  const usable = timesheets.filter(
    (t) => t.shiftAssignment && !billedShiftIds.has(t.shiftAssignment.shiftId),
  );
  if (usable.length === 0) {
    throw ApiError.badRequest('No un-invoiced timesheets for this client in that period');
  }

  const items = usable.map((t) => {
    const shift = t.shiftAssignment.shift;
    const rate = Number(shift.chargeRate || 0);
    const qty = Number(t.hoursWorked);
    const date = new Date(t.workDate).toISOString().slice(0, 10);
    return {
      description: `${shift.title} — ${date} (${t.staff.firstName} ${t.staff.lastName})`,
      quantity: qty,
      unitPrice: rate,
      amount: round2(qty * rate),
      shiftId: shift.id,
    };
  });

  const subtotal = round2(items.reduce((a, i) => a + i.amount, 0));
  const taxAmount = round2((subtotal * VAT_RATE) / 100);
  const total = round2(subtotal + taxAmount);
  const dueDate = new Date(Date.now() + 30 * 86_400_000);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: await nextInvoiceNumber(),
      clientId,
      status: 'DRAFT',
      currency: 'ZAR',
      issueDate: new Date(),
      dueDate,
      subtotal,
      taxRate: VAT_RATE,
      taxAmount,
      total,
      items: { create: items },
    },
    include: { items: true, client: true },
  });

  return invoice;
}

/**
 * Update an invoice's status. Marking PAID sets amountPaid = total + paidAt.
 */
async function setInvoiceStatus(invoiceId, status) {
  const valid = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'];
  if (!valid.includes(status)) throw ApiError.badRequest(`Invalid status: ${status}`);
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw ApiError.notFound('Invoice not found');

  const data = { status };
  if (status === 'PAID') { data.amountPaid = invoice.total; data.paidAt = new Date(); }
  return prisma.invoice.update({ where: { id: invoiceId }, data, include: { items: true } });
}

module.exports = { generateInvoice, setInvoiceStatus, VAT_RATE };
