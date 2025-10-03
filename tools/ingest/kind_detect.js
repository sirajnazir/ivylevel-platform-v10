"use strict";
// tools/ingest/kind_detect.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectKind = detectKind;
exports.normalizeDocType = normalizeDocType;
/**
 * Detect document kind based on filename and content
 */
function detectKind(filename, content) {
    const fn = filename.toLowerCase();
    const text = (content || "").toLowerCase().slice(0, 2000); // First 2k chars
    // 1. GAMEPLAN - Assessment/GamePlan reports
    if (fn.includes("assessment") || fn.includes("gameplan") || fn.includes("game_plan")) {
        return "GAMEPLAN";
    }
    if (text.includes("assessment report") || text.includes("game plan") || text.includes("initial evaluation")) {
        return "GAMEPLAN";
    }
    // 2. TRANS-INTEL - Transcript intelligence/analysis
    if (fn.includes("transcript") || fn.includes("trans_intel") || fn.includes("grade")) {
        return "TRANS-INTEL";
    }
    if (text.includes("transcript analysis") || text.includes("gpa") || text.includes("course rigor")) {
        return "TRANS-INTEL";
    }
    // 3. EXEC-INTEL - Executive summaries, weekly reports
    if (fn.includes("executive") || fn.includes("exec_intel") || fn.includes("weekly_report")) {
        return "EXEC-INTEL";
    }
    if (text.includes("executive summary") || text.includes("weekly progress") || text.includes("action items")) {
        return "EXEC-INTEL";
    }
    // 4. APP-DOC - Application documents (essays, lists, etc)
    if (fn.includes("essay") || fn.includes("application") || fn.includes("supplement")) {
        return "APP-DOC";
    }
    if (fn.includes("activities") || fn.includes("awards") || fn.includes("honors")) {
        return "APP-DOC";
    }
    if (text.includes("common app") || text.includes("supplemental essay") || text.includes("why us")) {
        return "APP-DOC";
    }
    // 5. Default fallback
    if (fn.includes("architecture"))
        return "ARCHITECTURE";
    if (fn.includes("strategy"))
        return "STRATEGY";
    if (fn.includes("research"))
        return "RESEARCH";
    return "GENERAL";
}
/**
 * Standardize document type from filename
 */
function normalizeDocType(docType) {
    const dt = docType.toLowerCase().replace(/[_-]/g, " ");
    // Normalize common variations
    if (dt.includes("assessment") && dt.includes("gameplan"))
        return "Assessment_GamePlan";
    if (dt.includes("assessment") && dt.includes("report"))
        return "Assessment_GamePlan";
    if (dt.includes("transcript") && dt.includes("intel"))
        return "Transcript_Intelligence";
    if (dt.includes("executive") && dt.includes("intel"))
        return "Executive_Intelligence";
    if (dt.includes("weekly") && dt.includes("report"))
        return "Weekly_Report";
    if (dt.includes("activities") || dt.includes("awards"))
        return "Activities_Awards_List";
    // Preserve original with underscores
    return docType.replace(/\s+/g, "_");
}
