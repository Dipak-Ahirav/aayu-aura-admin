import type { InvoiceDto } from '@aayu-aura/shared-types';

const pageWidth = 595;
const pageHeight = 842;
const margin = 42;

interface PdfPage {
  content: string[];
}

function sanitize(value: string | number | undefined): string {
  return String(value ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePdfText(value: string | number | undefined): string {
  return sanitize(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function money(valueInPaise: number): string {
  return `INR ${(valueInPaise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateLabel(value: string | undefined): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function truncate(value: string | undefined, maxLength: number): string {
  const text = sanitize(value);
  return text.length <= maxLength ? text : `${text.slice(0, Math.max(maxLength - 3, 0))}...`;
}

function text(
  page: PdfPage,
  value: string | number | undefined,
  x: number,
  y: number,
  size = 10,
): void {
  page.content.push(`BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`);
}

function line(page: PdfPage, x1: number, y1: number, x2: number, y2: number): void {
  page.content.push(`${x1} ${y1} m ${x2} ${y2} l S`);
}

function fillRect(page: PdfPage, x: number, y: number, width: number, height: number): void {
  page.content.push(`q 0.96 0.93 0.90 rg ${x} ${y} ${width} ${height} re f Q`);
}

function addPage(pages: PdfPage[], invoice: InvoiceDto): PdfPage {
  const page: PdfPage = { content: ['0.28 w', '0.12 0.12 0.12 RG'] };
  pages.push(page);

  text(page, 'Aayu & Aura', margin, 802, 20);
  text(page, 'Saree Business Admin Portal', margin, 782, 9);
  text(page, invoice.type, 420, 802, 16);
  text(page, `Invoice: ${invoice.invoiceNumber}`, 420, 782, 9);
  line(page, margin, 766, pageWidth - margin, 766);

  return page;
}

function addTableHeader(page: PdfPage, y: number): number {
  fillRect(page, margin, y - 14, pageWidth - margin * 2, 22);
  text(page, 'Item', 48, y - 7, 8);
  text(page, 'SKU/HSN', 228, y - 7, 8);
  text(page, 'Qty', 304, y - 7, 8);
  text(page, 'Rate', 342, y - 7, 8);
  text(page, 'GST', 402, y - 7, 8);
  text(page, 'Total', 474, y - 7, 8);
  return y - 28;
}

function addFooter(page: PdfPage, pageNumber: number, totalPages: number): void {
  line(page, margin, 42, pageWidth - margin, 42);
  text(page, 'Thank you for shopping with Aayu & Aura.', margin, 26, 8);
  text(page, `Page ${pageNumber} of ${totalPages}`, 492, 26, 8);
}

export function renderInvoicePdf(invoice: InvoiceDto): Buffer {
  const pages: PdfPage[] = [];
  let page = addPage(pages, invoice);

  text(page, 'Bill To', margin, 736, 11);
  text(page, invoice.customer.name, margin, 718, 10);
  text(page, invoice.customer.mobile, margin, 704, 9);
  text(page, invoice.customer.email, margin, 690, 9);
  text(page, truncate(invoice.customer.billingAddress, 64), margin, 676, 9);

  text(page, 'Ship To', 304, 736, 11);
  text(
    page,
    truncate(invoice.customer.shippingAddress || invoice.customer.billingAddress, 70),
    304,
    718,
    9,
  );
  text(
    page,
    [invoice.customer.state, invoice.customer.stateCode].filter(Boolean).join(' / '),
    304,
    704,
    9,
  );

  text(page, `Order: ${invoice.orderNumber}`, margin, 642, 9);
  text(page, `Invoice date: ${dateLabel(invoice.invoiceDate)}`, 214, 642, 9);
  text(page, `Due date: ${dateLabel(invoice.dueDate)}`, 404, 642, 9);
  line(page, margin, 626, pageWidth - margin, 626);

  let y = addTableHeader(page, 604);
  invoice.items.forEach((item) => {
    if (y < 132) {
      page = addPage(pages, invoice);
      y = addTableHeader(page, 724);
    }
    text(page, truncate(item.productName, 32), 48, y, 8);
    text(page, truncate([item.sku, item.hsn].filter(Boolean).join(' / '), 18), 228, y, 8);
    text(page, item.quantity, 304, y, 8);
    text(page, money(item.unitPriceInPaise), 342, y, 8);
    text(page, `${item.gstRate}% / ${money(item.taxAmountInPaise)}`, 402, y, 8);
    text(page, money(item.lineTotalInPaise), 474, y, 8);
    line(page, margin, y - 9, pageWidth - margin, y - 9);
    y -= 24;
  });

  if (y < 210) {
    page = addPage(pages, invoice);
    y = 724;
  }

  const totalsX = 360;
  line(page, totalsX, y, pageWidth - margin, y);
  y -= 18;
  [
    ['Subtotal', money(invoice.subtotalInPaise)],
    ['Discount', money(invoice.itemDiscountInPaise)],
    ['Taxable', money(invoice.taxableAmountInPaise)],
    ['GST', money(invoice.taxAmountInPaise)],
    ['Shipping', money(invoice.shippingChargeInPaise)],
    ['Packaging', money(invoice.packagingChargeInPaise)],
    ['Other', money(invoice.otherChargeInPaise)],
    ['Grand total', money(invoice.grandTotalInPaise)],
    ['Paid', money(invoice.paidAmountInPaise)],
    ['Due', money(invoice.dueAmountInPaise)],
  ].forEach(([label, value]) => {
    text(page, label, totalsX, y, label === 'Grand total' ? 10 : 9);
    text(page, value, 462, y, label === 'Grand total' ? 10 : 9);
    y -= 16;
  });

  if (invoice.notes) {
    text(page, 'Notes', margin, Math.max(y, 96), 10);
    text(page, truncate(invoice.notes, 95), margin, Math.max(y - 16, 80), 9);
  }

  pages.forEach((pdfPage, index) => addFooter(pdfPage, index + 1, pages.length));

  return buildPdf(pages);
}

function buildPdf(pages: PdfPage[]): Buffer {
  const objects: string[] = [];
  const fontId = 3 + pages.length * 2;
  const pageIds = pages.map((_, index) => 4 + index * 2);

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;

  pages.forEach((page, index) => {
    const contentId = 3 + index * 2;
    const pageId = 4 + index * 2;
    const stream = page.content.join('\n');
    objects[contentId - 1] =
      `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`;
    objects[pageId - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  objects[fontId - 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}
