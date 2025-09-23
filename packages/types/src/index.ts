export type RagRecord = {
  id: string;
  text: string;
  type: 'quote'|'script'|'fact';
  week?: number;
  phase?: number;
  layers?: string[];
  kind?: 'TRANS-INTEL'|'EXEC-INTEL'|'IMSG-INTEL'|'OTHER';
  doc_name?: string;
  link?: string;
  score?: number;
};
export type AgentState = {
  coachId: string;
  studentId?: string;
  nowWeek?: number;
  phase?: number;
  memory?: Record<string, any>;
};
