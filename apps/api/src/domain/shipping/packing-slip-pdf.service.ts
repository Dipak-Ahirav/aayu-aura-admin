import type { ShipmentDto } from '@aayu-aura/shared-types';

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

function truncate(value: string | undefined, maxLength: number): string {
  const text = sanitize(value);
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

function dateLabel(value: string | undefined): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
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

export function renderPackingSlipPdf(shipment: ShipmentDto): Buffer {
  const page: PdfPage = { content: ['0.28 w', '0.12 0.12 0.12 RG'] };
  text(page, 'Aayu & Aura', margin, 802, 20);
  text(page, 'Packing Slip', 420, 802, 18);
  text(page, `Shipment: ${shipment.shipmentNumber}`, 420, 782, 9);
  line(page, margin, 766, pageWidth - margin, 766);

  text(page, 'Ship To', margin, 736, 12);
  text(page, shipment.customer.name, margin, 718, 10);
  text(page, shipment.customer.mobile, margin, 704, 9);
  text(
    page,
    truncate(shipment.customer.shippingAddress || shipment.customer.billingAddress, 88),
    margin,
    690,
    9,
  );
  text(
    page,
    [shipment.customer.state, shipment.customer.stateCode].filter(Boolean).join(' / '),
    margin,
    676,
    9,
  );

  text(page, `Order: ${shipment.orderNumber}`, 340, 736, 9);
  text(page, `Courier: ${shipment.courier}`, 340, 720, 9);
  text(page, `Tracking: ${shipment.trackingNumber || '-'}`, 340, 704, 9);
  text(page, `Status: ${shipment.status}`, 340, 688, 9);
  text(page, `Dispatch: ${dateLabel(shipment.dispatchDate)}`, 340, 672, 9);
  text(page, `Expected: ${dateLabel(shipment.expectedDeliveryDate)}`, 340, 656, 9);
  text(page, `Packages: ${shipment.packageCount}`, 340, 640, 9);
  text(page, `Weight: ${shipment.packageWeightGrams} g`, 340, 624, 9);

  fillRect(page, margin, 582, pageWidth - margin * 2, 24);
  text(page, 'Item', 52, 590, 9);
  text(page, 'SKU', 330, 590, 9);
  text(page, 'Qty', 480, 590, 9);
  let y = 560;
  shipment.items.forEach((item) => {
    text(page, truncate(item.productName, 44), 52, y, 9);
    text(page, item.sku || '-', 330, y, 9);
    text(page, item.quantity, 480, y, 9);
    line(page, margin, y - 10, pageWidth - margin, y - 10);
    y -= 26;
  });

  if (shipment.notes) {
    text(page, 'Notes', margin, Math.max(y - 20, 92), 10);
    text(page, truncate(shipment.notes, 100), margin, Math.max(y - 38, 74), 9);
  }
  line(page, margin, 42, pageWidth - margin, 42);
  text(page, 'This slip is for packing and dispatch verification only.', margin, 26, 8);

  return buildPdf([page]);
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
