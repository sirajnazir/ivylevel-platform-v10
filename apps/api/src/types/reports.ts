/**
 * Report type definitions for v1.2.4
 */

export interface YieldReportCategory {
  category: string;
  total: number;
  accepted: number;
  rejected: number;
  waitlisted: number;
  win_rate_pct: number;
}

export interface YieldReport {
  type: "yield";
  studentId: string;
  generatedAt: string;
  summary: {
    totalApplications: number;
    totalAccepted: number;
    overallWinRate: number;
    categoriesAnalyzed: number;
  };
  categories: YieldReportCategory[];
  insights: {
    highYield: YieldReportCategory[];
    challenging: YieldReportCategory[];
    recommended: string[];
  };
}

export interface WeeklyActivity {
  week_start: string;
  applications: number;
  wins: number;
  losses: number;
  waitlisted: number;
  win_rate_pct: number;
}

export interface TemporalReport {
  type: "temporal";
  studentId: string;
  generatedAt: string;
  summary: {
    totalWeeks: number;
    bombardmentWeeks: number;
    rejectionRebounds: number;
    avgReboundDays: number | null;
  };
  weeklyActivity: WeeklyActivity[];
  patterns: {
    bombardment: {
      count: number;
      avgApplications: string;
      avgWinRate: string;
    };
    resilience: {
      rebounds: number;
      avgReboundDays: number | null;
      reboundSuccess: boolean;
    };
  };
}

export type Report = YieldReport | TemporalReport;