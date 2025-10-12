/**
 * Shared types for universal KB retrieval system
 */

export type ChipMeta = {
  type?: string;
  chip_type?: string;
  category?: string;
  week?: string | number;
  phase?: string;
  tags?: string[];
  source_doc?: {
    week?: string;
    phase?: string;
  };
  [k: string]: any;
};

export type Hit = {
  id: string;
  score: number;
  content: string;
  namespace: string;
  metadata: ChipMeta;
};

export type QueryTags = {
  tags: string[];
  preferTypes: string[];
};

export type ComposeResult = {
  answer: string;
  chips: string[];
  hits: Hit[];
  scaffold_used?: string;
  debug?: {
    matched_tags: string[];
    applied_priors: Record<string, number>;
    scaffold_id?: string;
    top1_score: number;
    assessment_gate_result?: any;
  };
};
