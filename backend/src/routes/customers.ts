import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import { deflateRawSync } from "zlib";
import {
  AuthRequest,
  authMiddleware,
  cafeAuthMiddleware,
} from "../middleware/auth";
import { getPublicErrorMessage } from "../utils/errors";
import { prisma } from "../config/prisma";

const router = Router();

const SEGMENT_COLORS: Record<string, string> = {
  "Yeni Musteri": "#4d8fcb",
  "Geri Donen Musteri": "#8f79d6",
  "Sadik Musteri": "#4f9a5f",
  "Kampanya Adayi": "#df955f",
  "Pasif Musteri": "#8f8a83",
};

const SEGMENT_LABELS: Record<string, string> = {
  "Yeni Musteri": "Yeni Müşteri",
  "Geri Donen Musteri": "Geri Dönen Müşteri",
  "Sadik Musteri": "Sadık Müşteri",
  "Kampanya Adayi": "Kampanya Adayı",
  "Pasif Musteri": "Pasif Müşteri",
};

const INTERACTION_LABELS: Record<string, string> = {
  site_visit: "Siteye Giriş",
  qr_scan: "QR Girişi",
  photo_share: "Fotoğraf Paylaşımı",
  campaign_sent: "Kampanya Gönderimi",
  email_open: "E-posta Açıldı",
  email_click: "E-posta Tıklandı",
  form_submit: "Form Gönderimi",
};

const INTERACTION_COLORS: Record<string, string> = {
  site_visit: "#4d8fcb",
  qr_scan: "#8f79d6",
  photo_share: "#e59f63",
  campaign_sent: "#df955f",
  email_open: "#67a86f",
  email_click: "#528bcc",
  form_submit: "#ddba71",
};

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeOptionalString = (value: unknown) => {
  const normalized = normalizeString(value);
  return normalized ? normalized : null;
};

const normalizeEmail = (value: unknown) => normalizeString(value).toLowerCase();

const normalizeLookup = (value: unknown) =>
  normalizeString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .toLowerCase();

const normalizeCustomerSegment = (value: unknown) => {
  const normalized = normalizeLookup(value);

  if (normalized.includes("sadik") || normalized.includes("loyal")) {
    return "Sadik Musteri";
  }
  if (normalized.includes("geri") || normalized.includes("return")) {
    return "Geri Donen Musteri";
  }
  if (normalized.includes("kampanya") || normalized.includes("campaign")) {
    return "Kampanya Adayi";
  }
  if (normalized.includes("pasif") || normalized.includes("passive") || normalized.includes("inactive")) {
    return "Pasif Musteri";
  }

  return "Yeni Musteri";
};

const getCustomerSegmentLabel = (value: unknown) =>
  SEGMENT_LABELS[normalizeCustomerSegment(value)];

const getCustomerCampaignCount = (customer: any) =>
  Number(customer?._count?.recipients ?? customer?.recipientCount ?? 0) || 0;

const getDaysSince = (value: Date | string | null | undefined, now = new Date()) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
};

const resolveCustomerSegment = (customer: any, now = new Date()) => {
  const storedSegment = normalizeCustomerSegment(customer?.segment);
  const campaignCount = getCustomerCampaignCount(customer);
  const daysSinceCreated = getDaysSince(customer?.createdAt, now) ?? 0;
  const daysSinceInteraction = getDaysSince(customer?.lastInteractionAt ?? customer?.updatedAt, now);

  if (customer?.emailSubscribed === false && (campaignCount === 0 || daysSinceInteraction === null || daysSinceInteraction > 30)) {
    return "Pasif Musteri";
  }

  if (storedSegment === "Pasif Musteri" || (daysSinceInteraction !== null && daysSinceInteraction > 45)) {
    return "Pasif Musteri";
  }

  if (storedSegment === "Sadik Musteri" || campaignCount >= 3) {
    return "Sadik Musteri";
  }

  if (campaignCount > 0 || storedSegment === "Geri Donen Musteri") {
    return "Geri Donen Musteri";
  }

  if (customer?.emailSubscribed !== false && (storedSegment === "Kampanya Adayi" || daysSinceCreated > 14)) {
    return "Kampanya Adayi";
  }

  return "Yeni Musteri";
};

const parseBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "evet"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "hayir", "hayır"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
};

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
};

const parseMoney = (value: unknown, fallback = 0) => {
  const parsed =
    typeof value === "string"
      ? Number.parseFloat(value.replace(",", "."))
      : typeof value === "number"
        ? value
        : NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.round(parsed * 100) / 100;
};

const parseOptionalDate = (value: unknown) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseTags = (value: unknown) => {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return Array.from(
    new Set(
      source
        .map((item) => normalizeString(item))
        .filter(Boolean)
        .slice(0, 12)
    )
  );
};

const toIso = (value: Date | string | null | undefined) =>
  value ? new Date(value).toISOString() : null;

const toStartOfMonth = (value: Date) => {
  const date = new Date(value);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getMonthBounds = () => {
  const currentStart = toStartOfMonth(new Date());
  const previousStart = new Date(currentStart);
  previousStart.setMonth(previousStart.getMonth() - 1);

  return {
    currentStart,
    previousStart,
  };
};

const calculateTrend = (current: number, previous: number) => {
  if (current <= 0) {
    return 0;
  }

  if (previous <= 0) {
    return 100;
  }

  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const getMetadataValue = (metadata: Prisma.JsonValue | null | undefined, key: string) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  return (metadata as Record<string, unknown>)[key];
};

const resolveInteractionType = (value: unknown) => {
  const normalized = normalizeString(value).toLowerCase().replace(/[\s-]+/g, "_");

  if (Object.keys(INTERACTION_LABELS).includes(normalized)) {
    return normalized;
  }

  return "site_visit";
};

const buildCustomerPayload = (body: any, fallback?: any) => {
  const metadata = typeof body?.metadata === "object" && body.metadata !== null ? body.metadata : fallback?.metadata ?? null;
  const name = normalizeOptionalString(body?.name ?? fallback?.name);
  const email = normalizeEmail(body?.email ?? fallback?.email);
  const phone = normalizeOptionalString(body?.phone ?? getMetadataValue(metadata, "phone") ?? fallback?.phone);
  const segment = normalizeCustomerSegment(body?.segment ?? getMetadataValue(metadata, "segment") ?? fallback?.segment);
  const tags = parseTags(body?.tags ?? getMetadataValue(metadata, "tags") ?? fallback?.tags);
  const emailSubscribed = parseBoolean(
    body?.emailSubscribed ?? getMetadataValue(metadata, "emailSubscribed") ?? fallback?.emailSubscribed,
    true
  );
  const lastInteractionAt =
    parseOptionalDate(body?.lastInteractionAt ?? getMetadataValue(metadata, "lastInteractionAt")) ??
    fallback?.lastInteractionAt ??
    null;
  const lastInteractionType = resolveInteractionType(
    body?.lastInteractionType ?? getMetadataValue(metadata, "lastInteractionType") ?? fallback?.lastInteractionType
  );

  return {
    email,
    name,
    phone,
    segment,
    tags,
    emailSubscribed,
    lastInteractionAt,
    lastInteractionType,
    metadata,
  };
};

const buildCustomerResponse = (customer: any) => {
  const lastInteractionType = resolveInteractionType(customer.lastInteractionType);

  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    segment: resolveCustomerSegment(customer),
    tags: customer.tags ?? [],
    emailSubscribed: customer.emailSubscribed,
    lastInteractionAt: toIso(customer.lastInteractionAt),
    lastInteractionType,
    lastInteractionLabel: INTERACTION_LABELS[lastInteractionType] ?? INTERACTION_LABELS.site_visit,
    metadata: customer.metadata,
    createdAt: toIso(customer.createdAt),
    updatedAt: toIso(customer.updatedAt),
    _count: customer._count,
  };
};

const formatCsvDate = (value: Date | string | null | undefined) => {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getCustomerRecipients = (customer: any) =>
  Array.isArray(customer?.recipients) ? customer.recipients : [];

const countRecipientsByStatus = (recipients: any[], status: string) =>
  recipients.filter((recipient) => normalizeString(recipient?.status).toLowerCase() === status).length;

const getLatestRecipient = (recipients: any[]) =>
  [...recipients].sort((left, right) => {
    const leftDate = new Date(left?.sentAt ?? left?.createdAt ?? 0).getTime();
    const rightDate = new Date(right?.sentAt ?? right?.createdAt ?? 0).getTime();
    return (Number.isNaN(rightDate) ? 0 : rightDate) - (Number.isNaN(leftDate) ? 0 : leftDate);
  })[0] ?? null;

const CUSTOMER_EXPORT_HEADERS = [
  "Ad Soyad",
  "E-posta",
  "Telefon",
  "Segment",
  "E-posta İzni",
  "Kampanya Sayısı",
  "Gönderilen",
  "Başarısız",
  "Son Kampanya",
  "Son Etkileşim",
  "Son Aktivite",
  "Kayıt Tarihi",
];

const buildCustomerExportRows = (customers: any[]) =>
  customers.map((customer) => {
    const recipients = getCustomerRecipients(customer);
    const latestRecipient = getLatestRecipient(recipients);
    const latestCampaign = latestRecipient?.campaign ?? null;

    return [
      customer.name ?? "",
      customer.email,
      customer.phone ?? "",
      getCustomerSegmentLabel(resolveCustomerSegment(customer)),
      customer.emailSubscribed ? "Evet" : "Hayır",
      getCustomerCampaignCount(customer),
      countRecipientsByStatus(recipients, "sent"),
      countRecipientsByStatus(recipients, "failed"),
      latestCampaign?.subject ?? "",
      INTERACTION_LABELS[resolveInteractionType(customer.lastInteractionType)] ?? INTERACTION_LABELS.site_visit,
      formatCsvDate(customer.lastInteractionAt),
      formatCsvDate(customer.createdAt),
    ];
  });

const escapeXml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const getExcelColumnName = (index: number) => {
  let column = "";
  let cursor = index + 1;

  while (cursor > 0) {
    const remainder = (cursor - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    cursor = Math.floor((cursor - 1) / 26);
  }

  return column;
};

const buildExcelCell = (value: unknown, rowIndex: number, columnIndex: number, styleId: number) => {
  const ref = `${getExcelColumnName(columnIndex)}${rowIndex}`;

  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}" s="${styleId}"><v>${value}</v></c>`;
  }

  return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
};

const buildWorksheetXml = (rows: unknown[][]) => {
  const lastColumn = getExcelColumnName(CUSTOMER_EXPORT_HEADERS.length - 1);
  const lastRow = Math.max(rows.length, 1);
  const sheetRows = rows
    .map((row, rowIndex) => {
      const excelRowIndex = rowIndex + 1;
      const styleId = rowIndex === 0 ? 1 : 2;
      const cells = row.map((value, columnIndex) => buildExcelCell(value, excelRowIndex, columnIndex, styleId)).join("");
      return `<row r="${excelRowIndex}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="22" customWidth="1"/>
    <col min="2" max="2" width="30" customWidth="1"/>
    <col min="3" max="3" width="18" customWidth="1"/>
    <col min="4" max="4" width="20" customWidth="1"/>
    <col min="5" max="8" width="15" customWidth="1"/>
    <col min="9" max="9" width="28" customWidth="1"/>
    <col min="10" max="12" width="19" customWidth="1"/>
  </cols>
  <sheetData>${sheetRows}</sheetData>
  <autoFilter ref="A1:${lastColumn}${lastRow}"/>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`;
};

const buildStylesXml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2B1F19"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right><top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let current = index;
    for (let bit = 0; bit < 8; bit += 1) {
      current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
    }
    table[index] = current >>> 0;
  }
  return table;
})();

const crc32 = (data: Buffer) => {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const getDosDateTime = () => {
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  return { dosTime, dosDate };
};

const createZip = (files: Array<{ name: string; content: string | Buffer }>) => {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { dosTime, dosDate } = getDosDateTime();

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content, "utf8");
    const compressed = deflateRawSync(data);
    const crc = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
};

const buildCustomersWorkbook = (customers: any[]) => {
  const rows = [CUSTOMER_EXPORT_HEADERS, ...buildCustomerExportRows(customers)];
  const worksheetXml = buildWorksheetXml(rows);

  return createZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    },
    {
      name: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>ShareVibe</Application>
</Properties>`,
    },
    {
      name: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Müşteri Raporu</dc:title>
  <dc:creator>ShareVibe</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Müşteriler" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: "xl/worksheets/sheet1.xml", content: worksheetXml },
    { name: "xl/styles.xml", content: buildStylesXml() },
  ]);
};

const getCustomerBaseWhere = (cafeId: string, query: any): Prisma.CustomerWhereInput => {
  const search = normalizeString(query.search);
  const tag = normalizeString(query.tag);
  const filters: Prisma.CustomerWhereInput[] = [{ cafeId }];

  if (tag && tag !== "all") {
    filters.push({ tags: { has: tag } });
  }

  if (search) {
    filters.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  return { AND: filters };
};

const compareString = (left: unknown, right: unknown) =>
  normalizeString(left).localeCompare(normalizeString(right), "tr", { sensitivity: "base" });

const compareNumber = (left: number, right: number) => left - right;

const compareDate = (left: Date | string | null | undefined, right: Date | string | null | undefined) => {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return compareNumber(Number.isNaN(leftTime) ? 0 : leftTime, Number.isNaN(rightTime) ? 0 : rightTime);
};

const sortCustomersForResponse = (customers: any[], sort: unknown, order: unknown) => {
  const normalizedSort = normalizeString(sort) || "createdAt";
  const direction = normalizeString(order).toLowerCase() === "asc" ? 1 : -1;

  return [...customers].sort((left, right) => {
    let result = 0;

    if (normalizedSort === "name") {
      result = compareString(left.name ?? left.email, right.name ?? right.email);
    } else if (normalizedSort === "campaigns") {
      result = compareNumber(getCustomerCampaignCount(left), getCustomerCampaignCount(right));
    } else if (normalizedSort === "lastInteractionAt") {
      result = compareDate(left.lastInteractionAt, right.lastInteractionAt);
    } else if (normalizedSort === "segment") {
      result = compareString(getCustomerSegmentLabel(resolveCustomerSegment(left)), getCustomerSegmentLabel(resolveCustomerSegment(right)));
    } else {
      result = compareDate(left.createdAt, right.createdAt);
    }

    if (result === 0) {
      result = compareDate(left.updatedAt, right.updatedAt);
    }

    return result * direction;
  });
};

const filterCustomersByDerivedSegment = (customers: any[], segment: unknown) => {
  const normalized = normalizeString(segment);
  if (!normalized || normalized === "all") {
    return customers;
  }

  const targetSegment = normalizeCustomerSegment(normalized);
  return customers.filter((customer) => resolveCustomerSegment(customer) === targetSegment);
};

const getCustomerOrderBy = (sort: unknown, order: unknown): Prisma.CustomerOrderByWithRelationInput => {
  const normalizedSort = normalizeString(sort) || "createdAt";
  const normalizedOrder: Prisma.SortOrder = normalizeString(order).toLowerCase() === "asc" ? "asc" : "desc";

  if (normalizedSort === "name") {
    return { name: normalizedOrder };
  }
  if (normalizedSort === "campaigns") {
    return { recipients: { _count: normalizedOrder } };
  }
  if (normalizedSort === "lastInteractionAt") {
    return { lastInteractionAt: { sort: normalizedOrder, nulls: "last" } };
  }
  if (normalizedSort === "segment") {
    return { segment: normalizedOrder };
  }

  return { createdAt: normalizedOrder };
};

router.post(
  "/cafes/:cafeId/customers/sync-self",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.params.cafeId;
      const normalizedHeaderEmail = normalizeEmail(req.userEmail);
      const normalizedAuthProvider = normalizeString(req.authProvider).toLowerCase();
      const isEmailVerified = req.emailVerified === true;

      if (!cafeId) {
        return res.status(400).json({ error: "Cafe ID is required" });
      }

      const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
      if (!cafe) {
        return res.status(404).json({ error: "Cafe not found" });
      }

      if (normalizedAuthProvider !== "google.com") {
        return res.status(403).json({
          error: "Only Google authenticated users can be synced as marketing customers",
        });
      }

      if (!isEmailVerified) {
        return res.status(403).json({
          error: "Only verified Google accounts can be synced as marketing customers",
        });
      }

      const currentUser = req.userId
        ? await prisma.user.findUnique({
            where: { id: req.userId },
            select: { email: true, name: true },
          })
        : null;

      const resolvedEmail = normalizeEmail(currentUser?.email) || normalizedHeaderEmail;

      if (!resolvedEmail) {
        return res.status(400).json({ error: "User email is required" });
      }

      const resolvedName =
        currentUser?.name ||
        (normalizeString(req.userName) ? normalizeString(req.userName) : null);

      const now = new Date();
      const lastInteractionType = resolveInteractionType(req.body?.lastInteractionType);
      const source = lastInteractionType === "photo_share" ? "website-photo-share" : "website-login";
      const customer = await prisma.customer.upsert({
        where: {
          cafeId_email: {
            cafeId,
            email: resolvedEmail,
          },
        },
        create: {
          cafeId,
          email: resolvedEmail,
          name: resolvedName,
          segment: "Yeni Musteri",
          tags: ["Google"],
          emailSubscribed: true,
          lastInteractionAt: now,
          lastInteractionType,
          metadata: {
            source,
            authProvider: "google.com",
            emailVerified: true,
            syncedAt: now.toISOString(),
          },
        },
        update: {
          ...(resolvedName ? { name: resolvedName } : {}),
          emailSubscribed: true,
          lastInteractionAt: now,
          lastInteractionType,
          metadata: {
            source,
            authProvider: "google.com",
            emailVerified: true,
            syncedAt: now.toISOString(),
          },
          updatedAt: now,
        },
        include: {
          _count: { select: { recipients: true } },
        },
      });

      return res.status(201).json(buildCustomerResponse(customer));
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to sync visitor customer", error) });
    }
  }
);

router.get(
  "/cafes/:cafeId/customers/overview",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const { currentStart, previousStart } = getMonthBounds();
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const previousWeekStart = new Date(weekStart);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);

      const customers = await prisma.customer.findMany({
        where: { cafeId },
        orderBy: [{ updatedAt: "desc" }],
        include: { _count: { select: { recipients: true } } },
      });

      const tagCounts = new Map<string, number>();
      const segmentCounts = new Map<string, number>([
        ["Yeni Musteri", 0],
        ["Geri Donen Musteri", 0],
        ["Sadik Musteri", 0],
        ["Kampanya Adayi", 0],
        ["Pasif Musteri", 0],
      ]);
      const interactionCounts = new Map<string, number>(
        Object.keys(INTERACTION_LABELS).map((key) => [key, 0])
      );

      for (const customer of customers) {
        const segmentKey = resolveCustomerSegment(customer);
        segmentCounts.set(segmentKey, (segmentCounts.get(segmentKey) ?? 0) + 1);

        const interactionKey = resolveInteractionType(customer.lastInteractionType);
        interactionCounts.set(interactionKey, (interactionCounts.get(interactionKey) ?? 0) + 1);

        for (const tag of customer.tags ?? []) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      }

      const totalCustomers = customers.length;
      const newCustomers = customers.filter((customer) => customer.createdAt >= currentStart).length;
      const previousNewCustomers = customers.filter(
        (customer) => customer.createdAt >= previousStart && customer.createdAt < currentStart
      ).length;
      const loyalCustomers = customers.filter((customer) => resolveCustomerSegment(customer) === "Sadik Musteri").length;
      const emailSubscribers = customers.filter((customer) => customer.emailSubscribed).length;
      const activeCustomers = customers.filter(
        (customer) => customer.lastInteractionAt && customer.lastInteractionAt >= weekStart
      ).length;
      const previousActiveCustomers = customers.filter(
        (customer) =>
          customer.lastInteractionAt &&
          customer.lastInteractionAt >= previousWeekStart &&
          customer.lastInteractionAt < weekStart
      ).length;
      const campaignReachedCustomers = customers.filter((customer) => getCustomerCampaignCount(customer) > 0).length;
      const topCustomers = sortCustomersForResponse(customers, "campaigns", "desc").slice(0, 5);

      const segments = Array.from(segmentCounts.entries()).map(([key, count]) => {
        return {
          key,
          label: getCustomerSegmentLabel(key),
          count,
          percent: totalCustomers > 0 ? Math.round((count / totalCustomers) * 1000) / 10 : 0,
          color: SEGMENT_COLORS[key],
        };
      });

      const interactions = Array.from(interactionCounts.entries()).map(([key, count]) => {
        return {
          key,
          label: INTERACTION_LABELS[key] ?? INTERACTION_LABELS.site_visit,
          count,
          percent: totalCustomers > 0 ? Math.round((count / totalCustomers) * 1000) / 10 : 0,
          color: INTERACTION_COLORS[key] ?? INTERACTION_COLORS.site_visit,
        };
      });
      const emailSubscriberRate = totalCustomers > 0 ? Math.round((emailSubscribers / totalCustomers) * 1000) / 10 : 0;
      const campaignReachedRate = totalCustomers > 0 ? Math.round((campaignReachedCustomers / totalCustomers) * 1000) / 10 : 0;
      const loyalCustomerRate = totalCustomers > 0 ? Math.round((loyalCustomers / totalCustomers) * 1000) / 10 : 0;

      return res.json({
        stats: {
          totalCustomers,
          newCustomers,
          loyalCustomers,
          emailSubscribers,
          activeCustomers,
          campaignReachedCustomers,
          trends: {
            totalCustomers: calculateTrend(newCustomers, previousNewCustomers),
            newCustomers: calculateTrend(newCustomers, previousNewCustomers),
            loyalCustomers: loyalCustomerRate,
            emailSubscribers: emailSubscriberRate,
            activeCustomers: calculateTrend(activeCustomers, previousActiveCustomers),
            campaignReachedCustomers: campaignReachedRate,
          },
        },
        segments,
        interactions,
        tags: Array.from(tagCounts.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
          .slice(0, 30),
        topCustomers: topCustomers.map(buildCustomerResponse),
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to fetch customer overview", error) });
    }
  }
);

router.post(
  "/cafes/:cafeId/customers",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const payload = buildCustomerPayload(req.body);

      if (!payload.email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const customer = await prisma.customer.upsert({
        where: {
          cafeId_email: {
            cafeId,
            email: payload.email,
          },
        },
        create: {
          cafeId,
          ...payload,
        },
        update: {
          name: payload.name,
          phone: payload.phone,
          segment: payload.segment,
          tags: payload.tags,
          emailSubscribed: payload.emailSubscribed,
          lastInteractionAt: payload.lastInteractionAt,
          lastInteractionType: payload.lastInteractionType,
          metadata: payload.metadata,
          updatedAt: new Date(),
        },
        include: {
          _count: { select: { recipients: true } },
        },
      });

      return res.status(201).json(buildCustomerResponse(customer));
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to create customer", error) });
    }
  }
);

router.get(
  "/cafes/:cafeId/customers",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const limit = Math.min(parsePositiveInt(req.query.limit, 10), 500);
      const page = Math.max(parsePositiveInt(req.query.page, 1), 1);
      const skip = req.query.skip !== undefined ? Math.max(Number.parseInt(req.query.skip as string, 10) || 0, 0) : (page - 1) * limit;
      const where = getCustomerBaseWhere(cafeId, req.query);
      const orderBy = getCustomerOrderBy(req.query.sort, req.query.order);

      const candidateCustomers = await prisma.customer.findMany({
        where,
        take: 10000,
        orderBy,
        include: {
          _count: { select: { recipients: true } },
          recipients: {
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              status: true,
              sentAt: true,
              failureReason: true,
              createdAt: true,
              campaign: {
                select: {
                  subject: true,
                  status: true,
                  sentAt: true,
                  scheduledAt: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });
      const filteredCustomers = filterCustomersByDerivedSegment(candidateCustomers, req.query.segment);
      const sortedCustomers = sortCustomersForResponse(filteredCustomers, req.query.sort, req.query.order);
      const customers = sortedCustomers.slice(skip, skip + limit);
      const total = filteredCustomers.length;

      return res.json({
        customers: customers.map(buildCustomerResponse),
        total,
        page,
        limit,
        pageCount: Math.max(1, Math.ceil(total / limit)),
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to fetch customers", error) });
    }
  }
);

router.get(
  "/cafes/:cafeId/customers/export",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const where = getCustomerBaseWhere(cafeId, req.query);
      const orderBy = getCustomerOrderBy(req.query.sort, req.query.order);
      const candidateCustomers = await prisma.customer.findMany({
        where,
        take: 5000,
        orderBy,
        include: {
          _count: { select: { recipients: true } },
          recipients: {
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              status: true,
              sentAt: true,
              createdAt: true,
              campaign: {
                select: {
                  subject: true,
                  sentAt: true,
                  scheduledAt: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });
      const customers = sortCustomersForResponse(
        filterCustomersByDerivedSegment(candidateCustomers, req.query.segment),
        req.query.sort,
        req.query.order
      );
      const safeCafeId = cafeId.replace(/[^a-zA-Z0-9_-]/g, "-");
      const workbook = buildCustomersWorkbook(customers);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="sharevibe-musteri-raporu-${safeCafeId}.xlsx"`
      );
      res.setHeader("Content-Length", workbook.length.toString());

      return res.status(200).send(workbook);
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to export customers", error) });
    }
  }
);

router.patch(
  "/cafes/:cafeId/customers/subscriptions",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const customerIds: string[] = Array.isArray(req.body?.customerIds)
        ? Array.from(
            new Set(
              req.body.customerIds
                .map((id: unknown) => normalizeString(id))
                .filter((id: string) => Boolean(id))
            )
          )
        : [];
      const emailSubscribed = parseBoolean(req.body?.emailSubscribed, true);

      if (customerIds.length === 0) {
        return res.status(400).json({ error: "Customer IDs are required" });
      }

      if (customerIds.length > 1000) {
        return res.status(400).json({ error: "Maximum 1,000 customers per update" });
      }

      const now = new Date();
      const result = await prisma.customer.updateMany({
        where: {
          cafeId,
          id: { in: customerIds },
        },
        data: {
          emailSubscribed,
          lastInteractionAt: now,
          lastInteractionType: "form_submit",
          updatedAt: now,
        },
      });

      return res.json({
        updated: result.count,
        emailSubscribed,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to update subscriptions", error) });
    }
  }
);

router.post(
  "/cafes/:cafeId/customers/bulk",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId!;
      const { customers } = req.body;

      if (!Array.isArray(customers) || customers.length === 0) {
        return res.status(400).json({ error: "Invalid customers array" });
      }

      if (customers.length > 10000) {
        return res
          .status(400)
          .json({ error: "Maximum 10,000 customers per import" });
      }

      const data = customers
        .map((customer: any) => buildCustomerPayload(customer))
        .filter((customer) => customer.email)
        .map((customer) => ({
          cafeId,
          ...customer,
        }));

      const result = await prisma.customer.createMany({
        data,
        skipDuplicates: true,
      });

      return res.json({
        imported: result.count,
        message: `${result.count} customers imported`,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({
          error: getPublicErrorMessage("Failed to import customers", error),
        });
    }
  }
);

router.get(
  "/cafes/:cafeId/customers/:customerId",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId;
      const customerId = req.params.customerId;

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          _count: { select: { recipients: true } },
          recipients: {
            select: {
              campaign: { select: { subject: true, sentAt: true } },
              status: true,
              sentAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });

      if (!customer || customer.cafeId !== cafeId) {
        return res.status(404).json({ error: "Customer not found" });
      }

      return res.json(buildCustomerResponse(customer));
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to fetch customer", error) });
    }
  }
);

router.patch(
  "/cafes/:cafeId/customers/:customerId",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId;
      const customerId = req.params.customerId;

      const existingCustomer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!existingCustomer || existingCustomer.cafeId !== cafeId) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const payload = buildCustomerPayload(req.body, existingCustomer);
      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: {
          name: payload.name,
          phone: payload.phone,
          segment: payload.segment,
          tags: payload.tags,
          emailSubscribed: payload.emailSubscribed,
          lastInteractionAt: payload.lastInteractionAt,
          lastInteractionType: payload.lastInteractionType,
          metadata: payload.metadata,
          updatedAt: new Date(),
        },
        include: {
          _count: { select: { recipients: true } },
        },
      });

      return res.json(buildCustomerResponse(updatedCustomer));
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to update customer", error) });
    }
  }
);

router.delete(
  "/cafes/:cafeId/customers/:customerId",
  authMiddleware,
  cafeAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const cafeId = req.cafeId;
      const customerId = req.params.customerId;

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer || customer.cafeId !== cafeId) {
        return res.status(404).json({ error: "Customer not found" });
      }

      await prisma.customer.delete({ where: { id: customerId } });

      return res.json({ message: "Customer deleted" });
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: getPublicErrorMessage("Failed to delete customer", error) });
    }
  }
);

export default router;
