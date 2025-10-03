export interface RagRecord {
  id: string;
  text: string;
  metadata?: Record<string, any>;
  embedding?: number[];
  score?: number;
}