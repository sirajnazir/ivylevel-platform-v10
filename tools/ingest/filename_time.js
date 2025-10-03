"use strict";
// tools/ingest/filename_time.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFilenameMeta = parseFilenameMeta;
exports.dateToPhase = dateToPhase;
exports.dateToWeek = dateToWeek;
/**
 * Parse filename for key metadata. Filenames follow patterns:
 *  - Huda_Architecture_2024-12-01_Jenny.docx  => { studentName: "Huda", docType: "Architecture", dateIso: "2024-12-01", coachName: "Jenny" }
 *  - Huda_Assessment_Gameplan_Report_2025-06-22_Jenny_v1.docx => { studentName: "Huda", docType: "Assessment_Gameplan_Report", dateIso: "2025-06-22", coachName: "Jenny", modelId: "v1" }
 */
function parseFilenameMeta(filename) {
    // Strip extension
    const base = filename.replace(/\.\w+$/, "");
    // Match patterns
    const parts = base.split("_");
    if (parts.length < 3)
        return {};
    const meta = {};
    // First part is student name
    meta.studentName = parts[0];
    // Find date pattern (YYYY-MM-DD)
    let dateIdx = -1;
    for (let i = 1; i < parts.length; i++) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(parts[i])) {
            meta.dateIso = parts[i];
            dateIdx = i;
            break;
        }
    }
    if (dateIdx === -1)
        return meta;
    // Everything between student and date is doc type
    meta.docType = parts.slice(1, dateIdx).join("_");
    // After date: coach name (and optional model id)
    if (dateIdx + 1 < parts.length) {
        meta.coachName = parts[dateIdx + 1];
    }
    if (dateIdx + 2 < parts.length) {
        meta.modelId = parts[dateIdx + 2];
    }
    return meta;
}
/**
 * Convert date to phase (based on IvyLevel calendar)
 */
function dateToPhase(dateIso) {
    const d = new Date(dateIso);
    const month = d.getMonth() + 1; // 1-12
    const year = d.getFullYear();
    // Simplified phase mapping:
    // Phase 1: June-August (summer before senior year)
    // Phase 2: Sept-Dec (fall senior year)
    // Phase 3: Jan-March (RD apps)
    // Phase 4: April-May (decisions)
    // Phase 5: June+ (post-decision)
    if (month >= 6 && month <= 8)
        return 1;
    if (month >= 9 && month <= 12)
        return 2;
    if (month >= 1 && month <= 3)
        return 3;
    if (month >= 4 && month <= 5)
        return 4;
    return 5;
}
/**
 * Convert date to week number (simplified)
 */
function dateToWeek(dateIso, baseDate = "2024-06-01") {
    const d = new Date(dateIso);
    const base = new Date(baseDate);
    const diffMs = d.getTime() - base.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.floor(diffDays / 7));
}
