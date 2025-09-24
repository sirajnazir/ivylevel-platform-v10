import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { parse as csvParse } from "csv-parse/sync";
import { z } from "zod";

const RowSchema = z.object({
  college: z.string().min(2),
  decision: z.string().min(2),
  date: z.string().optional(),
  round: z.string().optional(),   // REA/ED/EA/RD
  notes: z.string().optional(),
});

const INPUT_HINTS = [
  "college", "school", "institution",
  "decision", "result", "status",
  "date", "decision date", "notified",
  "round", "cycle",
  "notes", "comment",
];

function normalizeHeader(h: string) {
  return h.toLowerCase().trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w]+/g, "_");
}

function mapHeaders(headers: string[]) {
  const normalized = headers.map(normalizeHeader);
  const idx = {
    college: -1,
    decision: -1,
    date: -1,
    round: -1,
    notes: -1,
  };
  normalized.forEach((h, i) => {
    if (idx.college < 0 && /(college|school|institution)/.test(h)) idx.college = i;
    else if (idx.decision < 0 && /(decision|result|status)/.test(h)) idx.decision = i;
    else if (idx.date < 0 && /(date|notified)/.test(h)) idx.date = i;
    else if (idx.round < 0 && /(round|cycle)/.test(h)) idx.round = i;
    else if (idx.notes < 0 && /(notes|comment)/.test(h)) idx.notes = i;
  });
  if (idx.college < 0 || idx.decision < 0) {
    throw new Error(`Required headers missing. Found: ${headers.join(", ")}`);
  }
  return idx;
}

function parseCsv(buf: Buffer) {
  const rows = csvParse(buf, { columns: true, skip_empty_lines: true });
  const headers = Object.keys(rows[0] || {});
  const idx = mapHeaders(headers);
  return rows.map((r: any) => ({
    college: (r[headers[idx.college]] || "").toString().trim(),
    decision: (r[headers[idx.decision]] || "").toString().trim(),
    date: idx.date >= 0 ? (r[headers[idx.date]] || "").toString().trim() : undefined,
    round: idx.round >= 0 ? (r[headers[idx.round]] || "").toString().trim() : undefined,
    notes: idx.notes >= 0 ? (r[headers[idx.notes]] || "").toString().trim() : undefined,
  })).filter(x => x.college && x.decision);
}

function parseXlsx(buf: Buffer) {
  const wb = XLSX.read(buf, { type: "buffer" });
  // choose the first non-empty sheet
  const sheetName = wb.SheetNames.find(s => {
    const ws = wb.Sheets[s];
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
    return range.e.r > 0; // at least 2 rows
  }) || wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (!rows.length) return [];
  const headers = (rows[0] as string[]).map(h => (h ?? "").toString());
  const idx = mapHeaders(headers);
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as any[];
    if (!r) continue;
    const college = (r[idx.college] || "").toString().trim();
    const decision = (r[idx.decision] || "").toString().trim();
    if (!college || !decision) continue;
    out.push({
      college,
      decision,
      date: idx.date >= 0 ? (r[idx.date] || "").toString().trim() : undefined,
      round: idx.round >= 0 ? (r[idx.round] || "").toString().trim() : undefined,
      notes: idx.notes >= 0 ? (r[idx.notes] || "").toString().trim() : undefined,
    });
  }
  return out;
}

export function normalizeCollegeDecisions(inputFile: string, outDir: string, studentId = "huda") {
  const ext = path.extname(inputFile).toLowerCase();
  const base = path.basename(inputFile).replace(ext, "");
  const buf = fs.readFileSync(inputFile);
  let rows: any[] = [];

  if (ext === ".csv") rows = parseCsv(buf);
  else if (ext === ".xlsx" || ext === ".xls") rows = parseXlsx(buf);
  else throw new Error(`Unsupported file type: ${ext}`);

  const data = rows.map((r, i) => {
    const parsed = RowSchema.safeParse(r);
    if (!parsed.success) {
      // Skip bad rows but log once in console
      return null;
    }
    return {
      id: `${base}#${i}`,
      name: base,
      path: inputFile,
      kind: "APP-DOC",
      week: null,
      phase: null,
      date: r.date || null,
      studentId,
      text: JSON.stringify(r),
      entries: [r], // for consistency with canonical schema ("entries" array)
      segments: [], // not used here
      meta: {
        source_ext: ext.replace(".", ""),
        round: r.round || null,
      }
    };
  }).filter(Boolean);

  const outPath = path.join(outDir, `${base}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ kind: "APP-DOC", items: data }, null, 2), "utf8");
  return outPath;
}