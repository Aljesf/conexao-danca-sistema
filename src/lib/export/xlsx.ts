export type ExcelValueType = "text" | "currency" | "number" | "integer" | "percent" | "date" | "datetime";
export type ExcelAlignment = "left" | "center" | "right";

export type ExcelColumn<T> = {
  header: string;
  width?: number;
  type?: ExcelValueType;
  align?: ExcelAlignment;
  wrap?: boolean;
  placeholder?: string;
  value: (row: T) => unknown;
};

export type ExcelSummaryItem = {
  label: string;
  value: unknown;
  type?: ExcelValueType;
  placeholder?: string;
};

type ExportRowsToXlsxParams<T> = {
  fileName: string;
  sheetName: string;
  title: string;
  contextLabel?: string | null;
  summaryItems?: ExcelSummaryItem[];
  columns: ExcelColumn<T>[];
  rows: T[];
};

type BuiltXlsxFile = {
  fileName: string;
  bytes: Uint8Array;
  sheetName: string;
  tableHeaderRow: number;
};

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const CURRENCY_FORMAT = '[$R$-416] #,##0.00;[Red]-[$R$-416] #,##0.00';
const NUMBER_FORMAT = "#,##0.00";
const INTEGER_FORMAT = "0";
const PERCENT_FORMAT = "0.0%";
const DATE_FORMAT = "dd/mm/yyyy";
const DATETIME_FORMAT = "dd/mm/yyyy hh:mm";
const BORDER = {
  top: { style: "thin", color: { rgb: "E2E8F0" } },
  bottom: { style: "thin", color: { rgb: "E2E8F0" } },
  left: { style: "thin", color: { rgb: "E2E8F0" } },
  right: { style: "thin", color: { rgb: "E2E8F0" } },
};

const STYLES = {
  title: {
    font: { bold: true, sz: 15, color: { rgb: "0F172A" } },
    fill: { patternType: "solid", fgColor: { rgb: "F8FAFC" } },
    alignment: { horizontal: "left", vertical: "center" },
  },
  summaryLabel: {
    font: { bold: true, color: { rgb: "334155" } },
    fill: { patternType: "solid", fgColor: { rgb: "F8FAFC" } },
    alignment: { horizontal: "left", vertical: "center" },
    border: BORDER,
  },
  summaryLeft: {
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
    border: BORDER,
  },
  summaryCenter: {
    alignment: { horizontal: "center", vertical: "center" },
    border: BORDER,
  },
  summaryRight: {
    alignment: { horizontal: "right", vertical: "center" },
    border: BORDER,
  },
  header: {
    font: { bold: true, color: { rgb: "0F172A" } },
    fill: { patternType: "solid", fgColor: { rgb: "E2E8F0" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: BORDER,
  },
  textLeft: {
    alignment: { horizontal: "left", vertical: "top" },
    border: BORDER,
  },
  textLeftWrap: {
    alignment: { horizontal: "left", vertical: "top", wrapText: true },
    border: BORDER,
  },
  textCenter: {
    alignment: { horizontal: "center", vertical: "center" },
    border: BORDER,
  },
  textRight: {
    alignment: { horizontal: "right", vertical: "center" },
    border: BORDER,
  },
} as const;

function sanitizeSheetName(value: string): string {
  const trimmed = value.trim() || "Relatório";
  return trimmed.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
}

function sanitizeFileName(value: string): string {
  const trimmed = value.trim() || "relatorio";
  return trimmed.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-");
}

function replaceCommonLabels(value: string): string {
  return value
    .replace(/^Relatorio$/i, "Relatório")
    .replace(/^Nao classificado$/i, "Não classificado")
    .replace(/^Nao informado$/i, "Não informado")
    .replace(/^Sem vinculo NeoFin$/i, "Sem vínculo NeoFin")
    .replace(/^Itens sem vinculo NeoFin$/i, "Itens sem vínculo NeoFin")
    .replace(/^Descricao$/i, "Descrição")
    .replace(/^Observacao$/i, "Observação")
    .replace(/^Observacao resumida$/i, "Observação resumida")
    .replace(/^Competencia$/i, "Competência")
    .replace(/^Competencias futuras$/i, "Competências futuras")
    .replace(/^Referencia interna$/i, "Referência interna")
    .replace(/^Referencia operacional$/i, "Referência operacional")
    .replace(/^Recebido ultimos 7 dias$/i, "Recebido últimos 7 dias")
    .replace(/^Recebido no mes$/i, "Recebido no mês");
}

function normalizeDisplayText(value: unknown, placeholder = "-"): string {
  if (value === null || value === undefined) return replaceCommonLabels(placeholder);
  const normalized = String(value).trim();
  if (!normalized) return replaceCommonLabels(placeholder);
  return replaceCommonLabels(normalized);
}

function slugifySegment(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildExcelFileName(parts: Array<string | null | undefined>): string {
  const slug = parts
    .map((part) => slugifySegment(part))
    .filter(Boolean)
    .join("-");

  return sanitizeFileName(`${slug || "relatorio"}.xlsx`);
}

function toUint8Array(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value)) return Uint8Array.from(value);
  return new Uint8Array(value as ArrayBufferLike);
}

function parseDateLike(value: unknown, type: "date" | "datetime"): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const brDate = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (brDate) {
    const [, day, month, year, hour = "12", minute = "00"] = brDate;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0);
  }

  const onlyDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (onlyDate) {
    const [, year, month, day] = onlyDate;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  }

  const isoLikeDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoLikeDate && type === "date") {
    const [, year, month, day] = isoLikeDate;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  }

  const isoLike = new Date(trimmed);
  return Number.isNaN(isoLike.getTime()) ? null : isoLike;
}

function parseNumberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const compact = value.trim();
  if (!compact) return null;

  const sanitized = compact
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const numeric = Number(sanitized);
  return Number.isFinite(numeric) ? numeric : null;
}

function resolveAlignment(type: ExcelValueType, align?: ExcelAlignment): ExcelAlignment {
  if (align) return align;
  if (type === "currency" || type === "number" || type === "integer" || type === "percent") return "right";
  if (type === "date" || type === "datetime") return "center";
  return "left";
}

function resolveStyle(type: ExcelValueType, align: ExcelAlignment, wrap: boolean, summary = false) {
  if (summary) {
    if (align === "right") return STYLES.summaryRight;
    if (align === "center") return STYLES.summaryCenter;
    return STYLES.summaryLeft;
  }

  if (align === "right") return STYLES.textRight;
  if (align === "center") return STYLES.textCenter;
  return wrap ? STYLES.textLeftWrap : STYLES.textLeft;
}

function buildTypedCell(
  value: unknown,
  type: ExcelValueType,
  align?: ExcelAlignment,
  wrap = false,
  placeholder = "-",
  summary = false,
) {
  const finalAlign = resolveAlignment(type, align);
  const style = resolveStyle(type, finalAlign, wrap, summary);

  if (type === "currency") {
    const numeric = parseNumberLike(value);
    if (numeric === null) return { t: "s", v: normalizeDisplayText(value, placeholder), s: style };
    return { t: "n", v: numeric, z: CURRENCY_FORMAT, s: style };
  }

  if (type === "number") {
    const numeric = parseNumberLike(value);
    if (numeric === null) return { t: "s", v: normalizeDisplayText(value, placeholder), s: style };
    return { t: "n", v: numeric, z: NUMBER_FORMAT, s: style };
  }

  if (type === "integer") {
    const numeric = parseNumberLike(value);
    if (numeric === null) return { t: "s", v: normalizeDisplayText(value, placeholder), s: style };
    return { t: "n", v: Math.trunc(numeric), z: INTEGER_FORMAT, s: style };
  }

  if (type === "percent") {
    const numeric = parseNumberLike(value);
    if (numeric === null) return { t: "s", v: normalizeDisplayText(value, placeholder), s: style };
    const percentual = Math.abs(numeric) > 1 ? numeric / 100 : numeric;
    return { t: "n", v: percentual, z: PERCENT_FORMAT, s: style };
  }

  if (type === "date" || type === "datetime") {
    const dateValue = parseDateLike(value, type);
    if (!dateValue) return { t: "s", v: normalizeDisplayText(value, placeholder), s: style };
    return { t: "d", v: dateValue, z: type === "datetime" ? DATETIME_FORMAT : DATE_FORMAT, s: style };
  }

  return { t: "s", v: normalizeDisplayText(value, placeholder), s: style };
}

function buildTitleCell(value: string) {
  return { t: "s", v: normalizeDisplayText(value, "Relatório"), s: STYLES.title };
}

function buildSummaryLabelCell(value: string) {
  return { t: "s", v: normalizeDisplayText(value, "-"), s: STYLES.summaryLabel };
}

function buildHeaderCell(value: string) {
  return { t: "s", v: normalizeDisplayText(value, "-"), s: STYLES.header };
}

function applyFreezePane(XLSX: typeof import("xlsx"), bytes: Uint8Array, freezeAfterRow: number): Uint8Array {
  if (!Number.isFinite(freezeAfterRow) || freezeAfterRow <= 0) return bytes;

  const zip = XLSX.CFB.read(bytes, { type: "buffer" });
  const entry =
    XLSX.CFB.find(zip, "xl/worksheets/sheet1.xml")
    || XLSX.CFB.find(zip, "/xl/worksheets/sheet1.xml")
    || XLSX.CFB.find(zip, "Root Entry/xl/worksheets/sheet1.xml");

  if (!entry?.content) return bytes;

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const originalXml =
    typeof entry.content === "string" ? entry.content : decoder.decode(toUint8Array(entry.content));
  const topLeftCell = `A${freezeAfterRow + 1}`;
  const paneXml =
    `<pane ySplit="${freezeAfterRow}" topLeftCell="${topLeftCell}" activePane="bottomLeft" state="frozen"/>`
    + `<selection pane="bottomLeft" activeCell="${topLeftCell}" sqref="${topLeftCell}"/>`;

  let nextXml = originalXml.replace(
    /<sheetViews><sheetView([^>]*)\/><\/sheetViews>/,
    `<sheetViews><sheetView$1>${paneXml}</sheetView></sheetViews>`,
  );

  if (nextXml === originalXml) {
    nextXml = originalXml.replace(
      /<sheetViews><sheetView([^>]*)>([\s\S]*?)<\/sheetView><\/sheetViews>/,
      `<sheetViews><sheetView$1>${paneXml}</sheetView></sheetViews>`,
    );
  }

  if (nextXml === originalXml) return bytes;

  entry.content = encoder.encode(nextXml);
  return toUint8Array(XLSX.CFB.write(zip, { fileType: "zip", type: "buffer" }));
}

function triggerBrowserDownload(bytes: Uint8Array, fileName: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("download_xlsx_disponivel_apenas_no_navegador");
  }

  const blob = new Blob([bytes], { type: XLSX_MIME });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export async function buildXlsxFile<T>(params: ExportRowsToXlsxParams<T>): Promise<BuiltXlsxFile> {
  const importedXlsx = await import("xlsx");
  const XLSX = (importedXlsx.default ?? importedXlsx) as typeof import("xlsx");
  const summaryItems: ExcelSummaryItem[] = [
    { label: "Gerado em", value: new Date(), type: "datetime" },
    ...(params.contextLabel ? [{ label: "Contexto", value: params.contextLabel, type: "text" as const }] : []),
    ...(params.summaryItems ?? []),
  ];

  const aoa: unknown[][] = [[buildTitleCell(params.title)], []];

  for (const item of summaryItems) {
    aoa.push([
      buildSummaryLabelCell(item.label),
      buildTypedCell(item.value, item.type ?? "text", undefined, true, item.placeholder, true),
    ]);
  }

  aoa.push([]);
  const tableHeaderRow = aoa.length + 1;
  aoa.push(params.columns.map((column) => buildHeaderCell(column.header)));

  for (const row of params.rows) {
    aoa.push(
      params.columns.map((column) =>
        buildTypedCell(
          column.value(row),
          column.type ?? "text",
          column.align,
          column.wrap ?? false,
          column.placeholder ?? "-",
        ),
      ),
    );
  }

  const worksheet = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });
  const lastColumnIndex = Math.max(params.columns.length - 1, 1);
  const lastColumnRef = XLSX.utils.encode_col(lastColumnIndex);
  const lastRow = Math.max(aoa.length, tableHeaderRow);

  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastColumnIndex } }];
  worksheet["!autofilter"] = { ref: `A${tableHeaderRow}:${lastColumnRef}${lastRow}` };
  worksheet["!cols"] = params.columns.map((column) => ({
    wch: column.width ?? Math.max(column.header.length + 4, 16),
  }));
  worksheet["!rows"] = [
    { hpt: 24 },
    { hpt: 8 },
    ...summaryItems.map(() => ({ hpt: 20 })),
    { hpt: 8 },
    { hpt: 22 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(params.sheetName));

  const workbookBytes = toUint8Array(
    XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      cellStyles: true,
    }),
  );
  const bytes = applyFreezePane(XLSX, workbookBytes, tableHeaderRow);

  return {
    fileName: sanitizeFileName(params.fileName),
    bytes,
    sheetName: sanitizeSheetName(params.sheetName),
    tableHeaderRow,
  };
}

export async function exportRowsToXlsx<T>(params: ExportRowsToXlsxParams<T>): Promise<void> {
  const built = await buildXlsxFile(params);
  triggerBrowserDownload(built.bytes, built.fileName);
}
