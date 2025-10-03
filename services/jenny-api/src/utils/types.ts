export type Fact = {
  kind: string;
  value: string | number;
  unit?: string | null;
  date: string; // ISO
  source_id: string;
};

export type LifecycleItem = {
  item_id: string;
  school?: string | null;
  status: 'planned'|'in_progress'|'submitted'|'outcome'|'archived';
  submitted?: string | null;
  outcome_date?: string | null;
  sources?: string[];
};

export type SearchFilters = {
  student_id?: string;
  jtbd_id?: string;
  tactic_name?: string;
  framework?: string;
  date_from?: string;
  date_to?: string;
};

export type SearchHit = {
  namespace: 'jtbd' | 'interactions';
  id: string;
  text: string;
  metadata: Record<string, any>;
  score: number;
  bm25?: number;
  dense?: number;
};