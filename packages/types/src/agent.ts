export interface AgentState {
  phase?: number;
  studentId?: string;
  coachId?: string;
  context?: Record<string, any>;
  [key: string]: any;
}