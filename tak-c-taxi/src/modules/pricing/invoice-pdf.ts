import { fileURLToPath } from "node:url";
import path from "node:path";
import PDFDocument from "pdfkit";
import { prisma } from "../../db/client.js";

// dist/modules/pricing/invoice-pdf.js -> /app/assets (see Dockerfile's
// runtime stage — assets/ is copied to the image root alongside dist/).
const ASSETS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../assets");
const LOGO_PATH = path.join(ASSETS_DIR, "logo.png");
const FONT_REGULAR = path.join(ASSETS_DIR, "fonts", "Cairo-Regular.ttf");
const FONT_SEMIBOLD = path.join(ASSETS_DIR, "fonts", "Cairo-SemiBold.ttf");
const FONT_BOLD = path.join(ASSETS_DIR, "fonts", "Cairo-Bold.ttf");

const INK = "#1f1f1f";
const INK_SOFT = "#4a4a4a";
const YELLOW = "#f5c518";
const CREAM_SOFT = "#f7f3e9";
const BORDER = "#e0d8c4";

/**
 * pdfkit's EmbeddedFont already runs real per-word OpenType (GSUB) shaping
 * via fontkit's font.layout() — confirmed by reading pdfkit's own source
 * (EmbeddedFont.layout in node_modules/pdfkit/js/pdfkit.node.mjs) and by a
 * live render test: contextual Arabic letter joining comes out correct
 * with zero extra shaping work. What it does NOT do is bidi *word order* —
 * words are painted left-to-right in source-string order regardless of
 * script. So the only thing this needs to do is reverse token order for
 * an RTL line; reshaping (arabic-reshaper) or character-level bidi
 * reordering (bidi-js) on top of that actively breaks it — tried both
 * during development, confirmed by a live rendered/rasterized PDF: it
 * produces missing-glyph boxes (Cairo's cmap doesn't cover the legacy
 * presentation-forms block arabic-reshaper targets) and re-mangles glyph
 * order fontkit had already gotten right per word.
 */
function rtl(text: string): string {
  return text.split(" ").reverse().join(" ");
}

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function formatDateTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()} - ${hh}:${mm}`;
}

function money(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export class InvoiceNotFoundError extends Error {}

export interface InvoicePdfData {
  invoice: {
    id: string;
    baseCents: number;
    distanceCents: number;
    waitingCents: number;
    extraCents: number;
    totalCents: number;
    currency: string;
    distanceM: number;
    waitingS: number;
    issuedAt: Date;
  };
  ride: {
    pickupLabel: string;
    destLabel: string;
    requestedAt: Date;
    startedAt: Date | null;
    endedAt: Date | null;
  };
  rider: { fullName: string | null };
  driver: { fullName: string | null } | null;
  vehicle: { type: string; color: string; plate: string } | null;
}

/**
 * Pure rendering step, kept separate from buildInvoicePdf's Prisma fetch
 * so it's testable with fabricated data — this sandbox has no local
 * Postgres to build against, and Arabic PDF text shaping specifically
 * needs to be checked by actually rasterizing and looking at it, not just
 * type-checked (see the module comment on rtl() for what that caught).
 */
export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const { invoice, ride, rider, driver, vehicle } = data;

  const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Tak-C.taxi Invoice ${invoice.id}` } });
  doc.registerFont("Cairo", FONT_REGULAR);
  doc.registerFont("Cairo-SemiBold", FONT_SEMIBOLD);
  doc.registerFont("Cairo-Bold", FONT_BOLD);

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const PAGE_MARGIN = 40;
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  const valueColWidth = contentWidth * 0.4;
  const labelColWidth = contentWidth - valueColWidth;
  const valueColX = PAGE_MARGIN;
  const labelColX = PAGE_MARGIN + valueColWidth;

  // rtl() applies to both sides unconditionally — every value passed
  // through here is either dynamic (names, address labels) or a
  // multi-word literal, and forgetting it on even one call site produces
  // backwards word order (caught live: "أحمد الخطيب" rendered as "الخطيب
  // أحمد" before this was centralized here instead of left to call sites
  // to remember individually).
  function row(y: number, label: string, value: string, opts: { bold?: boolean; size?: number; color?: string } = {}) {
    doc
      .font(opts.bold ? "Cairo-SemiBold" : "Cairo")
      .fontSize(opts.size ?? 11)
      .fillColor(opts.color ?? INK);
    doc.text(rtl(label), labelColX, y, { width: labelColWidth, align: "right" });
    doc.text(rtl(value), valueColX, y, { width: valueColWidth, align: "right" });
  }

  function divider(y: number, color = BORDER) {
    doc.moveTo(PAGE_MARGIN, y).lineTo(doc.page.width - PAGE_MARGIN, y).strokeColor(color).lineWidth(1).stroke();
  }

  // ---- Header --------------------------------------------------------
  try {
    doc.image(LOGO_PATH, doc.page.width - PAGE_MARGIN - 130, PAGE_MARGIN, { width: 130 });
  } catch {
    // Logo is a real committed asset (assets/logo.png) — this only guards
    // against an unexpected missing-file deploy, never a stub fallback.
  }

  doc.font("Cairo-Bold").fontSize(22).fillColor(INK).text(rtl("فاتورة الرحلة"), PAGE_MARGIN, PAGE_MARGIN + 50, {
    width: contentWidth,
    align: "right",
  });
  doc
    .font("Cairo")
    .fontSize(10)
    .fillColor(INK_SOFT)
    .text(rtl(`رقم الفاتورة: ${invoice.id} — ${formatDateTime(invoice.issuedAt)}`), PAGE_MARGIN, PAGE_MARGIN + 82, {
      width: contentWidth,
      align: "right",
    });

  divider(PAGE_MARGIN + 108, YELLOW);

  // ---- Trip details ----------------------------------------------------
  let y = PAGE_MARGIN + 128;
  doc.font("Cairo-SemiBold").fontSize(13).fillColor(INK).text(rtl("تفاصيل الرحلة"), PAGE_MARGIN, y, { width: contentWidth, align: "right" });
  y += 24;
  row(y, "من", ride.pickupLabel);
  y += 20;
  row(y, "إلى", ride.destLabel);
  y += 20;
  row(y, "تاريخ الرحلة", formatDateTime(ride.endedAt ?? ride.requestedAt));
  y += 20;
  row(y, "المسافة", `${(invoice.distanceM / 1000).toFixed(1)} كم`);
  y += 20;
  if (ride.startedAt && ride.endedAt) {
    const durationMin = Math.max(1, Math.round((ride.endedAt.getTime() - ride.startedAt.getTime()) / 60000));
    row(y, "مدة الرحلة", `${durationMin} دقيقة`);
    y += 20;
  }

  // ---- Rider & driver ----------------------------------------------------
  y += 12;
  divider(y);
  y += 20;
  doc.font("Cairo-SemiBold").fontSize(13).fillColor(INK).text(rtl("الراكب والسائق"), PAGE_MARGIN, y, { width: contentWidth, align: "right" });
  y += 24;
  row(y, "الراكب", rider.fullName ?? "—");
  y += 20;
  if (driver) {
    row(y, "السائق", driver.fullName ?? "—");
    y += 20;
  }
  if (vehicle) {
    row(y, "السيارة", `${vehicle.type} ${vehicle.color}`);
    y += 20;
    row(y, "رقم اللوحة", vehicle.plate);
    y += 20;
  }

  // ---- Fare breakdown ----------------------------------------------------
  y += 12;
  divider(y);
  y += 20;
  doc.font("Cairo-SemiBold").fontSize(13).fillColor(INK).text(rtl("تفاصيل الفاتورة"), PAGE_MARGIN, y, { width: contentWidth, align: "right" });
  y += 24;
  row(y, "الأجرة الأساسية", money(invoice.baseCents, invoice.currency));
  y += 20;
  row(y, "أجرة المسافة", money(invoice.distanceCents, invoice.currency));
  y += 20;
  if (invoice.waitingS > 0) {
    const waitingMin = Math.ceil(invoice.waitingS / 60);
    row(y, `رسوم الانتظار — ${waitingMin} د`, money(invoice.waitingCents, invoice.currency));
    y += 20;
  }
  if (invoice.extraCents > 0) {
    row(y, "رسوم إضافية", money(invoice.extraCents, invoice.currency));
    y += 20;
  }

  y += 8;
  divider(y);
  y += 16;
  doc.rect(PAGE_MARGIN, y, contentWidth, 40).fill(CREAM_SOFT);
  row(y + 11, "الإجمالي", money(invoice.totalCents, invoice.currency), { bold: true, size: 16, color: INK });

  // ---- Footer --------------------------------------------------------
  doc
    .font("Cairo")
    .fontSize(9)
    .fillColor(INK_SOFT)
    .text(rtl("شكرًا لاستخدامك تكسي — فاتورة صادرة آليًا ولا تحتاج توقيعًا"), PAGE_MARGIN, doc.page.height - 60, {
      width: contentWidth,
      align: "center",
    });

  doc.end();
  return done;
}

/**
 * Regenerated on every call from the permanently-stored Ride/Invoice rows
 * — never rendered once and cached as a file. The underlying data is what
 * actually needs to survive; a single-page PDF costs a few milliseconds
 * to build, so there's nothing worth pre-generating or storing on an
 * already memory-constrained box.
 */
export async function buildInvoicePdf(rideId: string): Promise<Buffer> {
  const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: { user: true } });
  const invoice = ride ? await prisma.invoice.findUnique({ where: { rideId } }) : null;
  if (!ride || !invoice) throw new InvoiceNotFoundError(`No issued invoice for ride ${rideId}`);

  const driver = ride.driverId
    ? await prisma.driver.findUnique({ where: { id: ride.driverId }, include: { user: true } })
    : null;
  const vehicle = ride.driverId ? await prisma.vehicle.findFirst({ where: { driverId: ride.driverId } }) : null;

  return renderInvoicePdf({
    invoice,
    ride,
    rider: { fullName: ride.user.fullName },
    driver: driver ? { fullName: driver.user.fullName } : null,
    vehicle: vehicle ? { type: vehicle.type, color: vehicle.color, plate: vehicle.plate } : null,
  });
}
