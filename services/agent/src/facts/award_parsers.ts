/**
 * Universal award parsers for different document formats
 */

/**
 * Parse numbered inline awards format (e.g., from GAMEPLAN docs)
 * Example: "1. NCWiT Aspirations in Computing Award ( for Aptitude and Passion) 2. Presidential Volunteer Service Award"
 */
export function parseNumberedInlineAwards(text: string): string[] {
  const awards: string[] = [];
  
  // Match pattern: number. Award Name (optional parenthetical) 
  // Stop before next number or end
  const pattern = /\d+\.\s*([^(\d]+?)(?:\s*\([^)]+\))?\s*(?=\d+\.|$)/gi;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const awardName = match[1].trim();
    if (awardName && !isJunkLabel(awardName)) {
      awards.push(normalizeAwardName(awardName));
    }
  }
  
  return awards;
}

/**
 * Parse bulleted awards format
 * Example: "• Award Name - Level\n• Another Award"
 */
export function parseBulletedAwards(text: string): string[] {
  const awards: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Match bullet points (•, -, *, etc.) followed by award name
    const match = line.match(/^[\s]*[•\-\*]\s*(.+?)(?:\s*[-–]\s*(International|National|Regional|State|School))?$/i);
    if (match) {
      const awardName = match[1].trim();
      if (awardName && !isJunkLabel(awardName)) {
        awards.push(normalizeAwardName(awardName));
      }
    }
  }
  
  return awards;
}

/**
 * Parse final award list format (APP-DOC style)
 * Example: "Games for Change Writing Impact Award - International"
 */
export function parseFinalAwardList(text: string): string[] {
  const awards: string[] = [];
  
  // Look for "Final Award List" or similar headers
  const afterFinal = text.match(/final\s+award\s+list[:\s]*([\s\S]+?)(?=final\s+\w+\s+list|$)/i);
  const content = afterFinal ? afterFinal[1] : text;
  
  // Parse "Award Name - Level" format
  const pattern = /([^-\n]+?)\s*[-–]\s*(International|National|Regional|State|School)/gi;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const awardName = match[1].trim();
    if (awardName && !isJunkLabel(awardName)) {
      awards.push(normalizeAwardName(awardName));
    }
  }
  
  // Also try line-by-line parsing for awards without levels
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && 
        !trimmed.match(/^(final|award|list|honors)/i) && 
        !awards.some(a => a.toLowerCase() === trimmed.toLowerCase()) &&
        !isJunkLabel(trimmed)) {
      awards.push(normalizeAwardName(trimmed));
    }
  }
  
  return awards;
}

/**
 * Check if a string is a junk label
 */
function isJunkLabel(text: string): boolean {
  const junkPatterns = [
    /^awards?\s*(and\s*honors?)?\s*[:.]?\s*$/i,
    /^honors?\s*[:.]?\s*$/i,
    /^activities?\s*[:.]?\s*$/i,
    /^extracurriculars?\s*[:.]?\s*$/i,
    /^only\s+\d+\s+academic\s+awards?$/i,
    /^\d+\s*$/,  // Just a number
    /^[a-z]\.\s*$/i,  // Just a letter with period
  ];
  
  return junkPatterns.some(pattern => pattern.test(text));
}

/**
 * Normalize award name
 */
function normalizeAwardName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/["""]/g, '"')
    .replace(/[''']/g, "'")
    .replace(/\s*\([^)]*\)\s*$/, '') // Remove trailing parenthetical
    .trim();
}

/**
 * Main extraction function that tries all parsers
 */
export function extractAwardsUniversal(text: string, kind?: string): string[] {
  const allAwards = new Set<string>();
  
  // Try numbered format (common in GAMEPLAN)
  if (!kind || kind === 'GAMEPLAN') {
    const numbered = parseNumberedInlineAwards(text);
    numbered.forEach(a => allAwards.add(a));
  }
  
  // Try bulleted format
  const bulleted = parseBulletedAwards(text);
  bulleted.forEach(a => allAwards.add(a));
  
  // Try final award list format (common in APP-DOC)
  if (!kind || kind === 'APP-DOC') {
    const finalList = parseFinalAwardList(text);
    finalList.forEach(a => allAwards.add(a));
  }
  
  return Array.from(allAwards);
}