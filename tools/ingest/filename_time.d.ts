interface FilenameMeta {
    studentName?: string;
    docType?: string;
    dateIso?: string;
    coachName?: string;
    modelId?: string;
}
/**
 * Parse filename for key metadata. Filenames follow patterns:
 *  - Huda_Architecture_2024-12-01_Jenny.docx  => { studentName: "Huda", docType: "Architecture", dateIso: "2024-12-01", coachName: "Jenny" }
 *  - Huda_Assessment_Gameplan_Report_2025-06-22_Jenny_v1.docx => { studentName: "Huda", docType: "Assessment_Gameplan_Report", dateIso: "2025-06-22", coachName: "Jenny", modelId: "v1" }
 */
export declare function parseFilenameMeta(filename: string): FilenameMeta;
/**
 * Convert date to phase (based on IvyLevel calendar)
 */
export declare function dateToPhase(dateIso: string): number;
/**
 * Convert date to week number (simplified)
 */
export declare function dateToWeek(dateIso: string, baseDate?: string): number;
export {};
