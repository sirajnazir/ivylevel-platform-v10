/**
 * v3.7.3 Activity Name Normalization
 * Fuzzy-matches activity names from UAPX to student's known ECs to avoid typos/variants
 */

import type { Pool } from 'pg';

interface ECName {
  title_name: string;
  item_type: string;
}

/**
 * Normalize activity name using fuzzy matching against student's EC ledger
 * Maps variants like "the empowering ai" → "Empowering AI"
 */
export async function normalizeActivityName(
  pg: Pool,
  studentId: string,
  rawName: string | undefined
): Promise<string | undefined> {
  if (!rawName) return undefined;

  try {
    // Get student's known EC names from kb_items
    const query = `
      SELECT DISTINCT title_name, item_type
      FROM kb_items
      WHERE student_id = $1
        AND item_type IN ('ec', 'activity', 'extracurricular')
        AND title_name IS NOT NULL
      ORDER BY title_name
    `;
    const { rows } = await pg.query<ECName>(query, [studentId]);

    if (rows.length === 0) {
      // No ECs in ledger, return cleaned raw name
      return cleanActivityName(rawName);
    }

    // Simple fuzzy matching: find best match
    const normalized = rawName.toLowerCase().trim().replace(/\s+/g, ' ');

    // Exact match (case-insensitive)
    const exactMatch = rows.find(ec =>
      ec.title_name.toLowerCase() === normalized
    );
    if (exactMatch) return exactMatch.title_name;

    // Partial match: activity name contains or is contained by raw name
    const partialMatch = rows.find(ec => {
      const ecLower = ec.title_name.toLowerCase();
      return ecLower.includes(normalized) || normalized.includes(ecLower);
    });
    if (partialMatch) return partialMatch.title_name;

    // Stopword-filtered match: remove common words and try again
    const stopwords = ['the', 'a', 'an', 'my', 'our', 'for', 'on', 'in', 'at', 'to', 'of'];
    const filteredRaw = normalized
      .split(' ')
      .filter(word => !stopwords.includes(word))
      .join(' ');

    const filteredMatch = rows.find(ec => {
      const ecFiltered = ec.title_name
        .toLowerCase()
        .split(' ')
        .filter(word => !stopwords.includes(word))
        .join(' ');
      return ecFiltered === filteredRaw || ecFiltered.includes(filteredRaw) || filteredRaw.includes(ecFiltered);
    });
    if (filteredMatch) return filteredMatch.title_name;

    // No match found, return cleaned raw name
    return cleanActivityName(rawName);

  } catch (error) {
    console.error('[activityNormalizer] Error normalizing activity name:', error);
    return cleanActivityName(rawName);
  }
}

/**
 * Clean raw activity name: trim, normalize spaces, title case
 */
function cleanActivityName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
