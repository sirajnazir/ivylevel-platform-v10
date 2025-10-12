import { SearchFilters } from '../utils/types.js';

export type RewriteOut = { q: string; filters: SearchFilters };

export function queryRewrite(inputQ: string, context: { student_id?: string; timeBounds?: {from?: string; to?: string}; entityTypes?: string[] }): RewriteOut {
  const filters: SearchFilters = {};
  if (context.student_id) filters.student_id = context.student_id;
  // naive: append entity hints to query
  const hints = context.entityTypes?.length ? (' ' + context.entityTypes.join(' ')) : '';
  const q = `${inputQ}${hints}`.trim();
  return { q, filters };
}