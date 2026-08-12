// Invoices controller (ADMIN): list, get, generate, update status, PDF.
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { prisma } = require('../config/db');
const { ApiError } = require('../utils/http');
const { generateInvoice, setInvoiceStatus } = require('../services/invoicing.service');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png');
const NAVY = '#1F3D5C', TEAL = '#2F7D71', GREY = '#61707A';
const money = (v) => `R ${Number(v || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dfmt = (d) => (d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

async function list(req, res) {
  const { clientId, status } = req.query;
  const where = { ...(clientId && { clientId }), ...(status && { status }) };
  const invoices = await prisma.invoice.findMany({
    where, orderBy: { issueDate: 'desc' },
    include: { client: { select: { name: true } }, _count: { select: { items: true } } },
  });
  res.json({ invoices });
}

async function getOne(req, res) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { items: true, client: true },
  });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  res.json({ invoice });
}

async function generate(req, res) {
  const { clientId, start, end } = req.body;
  if (!clientId || !start || !end) throw ApiError.badRequest('clientId, start and end are required');
  const invoice = await generateInvoice(clientId, { start, end });
  res.status(201).json({ invoice });
}

async function updateStatus(req, res) {
  const invoice = await setInvoiceStatus(req.params.id, req.body.status);
  res.json({ invoice });
}

/** GET /api/invoices/:id/pdf — stream a branded PDF invoice. */
async function pdf(req, res) {
  const inv = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { items: true, client: true },
  });
  if (!inv) throw ApiError.notFound('Invoice not found');

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${inv.invoiceNumber || 'invoice'}.pdf"`);
  doc.pipe(res);

  // Header
  if (fs.existsSync(LOGO_PATH)) { try { doc.image(LOGO_PATH, 50, 45, { width: 64 }); } catch (_) {} }
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(20).text('Hazel Glen Care', 125, 52);
  doc.font('Helvetica').fontSize(9).fillColor(GREY)
    .text('Unit 13, Smithfield Complex, 70 Bass Street', 125, 76)
    .text('Boksburg, Gauteng, 1459', 125, 88)
    .text('care@hazelglencare.co.za', 125, 100);

  doc.moveTo(50, 128).lineTo(545, 128).strokeColor('#E0D8C8').stroke();

  // Invoice meta
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(16).text('INVOICE', 50, 145);
  doc.font('Helvetica').fontSize(10).fillColor(GREY)
    .text(`Invoice #: ${inv.invoiceNumber || inv.id.slice(0, 8)}`, 50, 168)
    .text(`Issued: ${dfmt(inv.issueDate)}`, 50, 182)
    .text(`Due: ${dfmt(inv.dueDate)}`, 50, 196)
    .text(`Status: ${inv.status}`, 50, 210);

  // Bill to
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text('BILL TO', 340, 168);
  doc.font('Helvetica').fillColor(GREY).fontSize(10)
    .text(inv.client?.name || '—', 340, 182)
    .text(inv.client?.billingEmail || inv.client?.email || '', 340, 196);
  if (inv.client?.vatNumber) doc.text(`VAT: ${inv.client.vatNumber}`, 340, 210);

  // Table header
  let y = 250;
  doc.rect(50, y, 495, 22).fill('#F5EEE2');
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9)
    .text('DESCRIPTION', 58, y + 7)
    .text('QTY', 350, y + 7, { width: 40, align: 'right' })
    .text('RATE', 400, y + 7, { width: 60, align: 'right' })
    .text('AMOUNT', 470, y + 7, { width: 68, align: 'right' });
  y += 22;

  doc.font('Helvetica').fillColor('#33424E').fontSize(9);
  (inv.items || []).forEach((it) => {
    doc.text(it.description || '', 58, y + 7, { width: 285 })
      .text(String(Number(it.quantity)), 350, y + 7, { width: 40, align: 'right' })
      .text(money(it.unitPrice), 400, y + 7, { width: 60, align: 'right' })
      .text(money(it.amount), 470, y + 7, { width: 68, align: 'right' });
    y += 22;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#EFE9DC').stroke();
  });

  // Totals
  y += 12;
  const row = (label, val, bold) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(bold ? NAVY : GREY).fontSize(bold ? 12 : 10)
      .text(label, 360, y, { width: 100, align: 'right' })
      .text(val, 462, y, { width: 76, align: 'right' });
    y += bold ? 20 : 16;
  };
  row('Subtotal', money(inv.subtotal));
  row(`VAT (${Number(inv.taxRate || 15)}%)`, money(inv.taxAmount));
  row('Total', money(inv.total), true);
  row('Paid', money(inv.amountPaid));
  doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(11)
    .text('Balance due', 360, y, { width: 100, align: 'right' })
    .text(money(Number(inv.total) - Number(inv.amountPaid)), 462, y, { width: 76, align: 'right' });

  // Footer
  doc.font('Helvetica').fillColor(GREY).fontSize(9)
    .text('Thank you for trusting Hazel Glen Care. Payment due within the stated terms. Queries: care@hazelglencare.co.za', 50, 760, { width: 495, align: 'center' });

  doc.end();
}

module.exports = { list, getOne, generate, updateStatus, pdf };
