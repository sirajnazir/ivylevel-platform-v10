/**
 * Text Normalization
 *
 * Handles multilingual inputs, typos, slang, and character-level variations
 * so that intent classification is robust across noisy inputs.
 */

/**
 * Normalize text for intent classification
 */
export function normalizeText(text: string): string {
  if (!text) return "";

  let normalized = text;

  // 1. Unicode normalization (handles accents, diacritics)
  normalized = normalized.normalize('NFKD');

  // 2. Convert to lowercase for case-insensitive matching
  normalized = normalized.toLowerCase();

  // 3. Fix smart quotes and apostrophes
  normalized = normalized.replace(/['']/g, "'");
  normalized = normalized.replace(/[""]/g, '"');

  // 4. Expand common abbreviations and slang
  const abbreviations: Record<string, string> = {
    'hr': 'hour',
    'hrs': 'hours',
    'plz': 'please',
    'pls': 'please',
    'thx': 'thanks',
    'ty': 'thank you',
    'ur': 'your',
    'r': 'are',
    'u': 'you',
    'wht': 'what',
    'wat': 'what',
    'y': 'why',
    'bc': 'because',
    'b/c': 'because',
    'w/': 'with',
    'w/o': 'without',
    'rn': 'right now',
    'asap': 'as soon as possible',
    'btw': 'by the way',
    'fyi': 'for your information',
    'idk': 'i do not know',
    'imo': 'in my opinion',
    'tbh': 'to be honest',
    'nvm': 'never mind',
    'lol': '',
    'lmao': '',
    'omg': ''
  };

  // Word boundary replacement for abbreviations
  for (const [abbrev, expansion] of Object.entries(abbreviations)) {
    const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
    normalized = normalized.replace(regex, expansion);
  }

  // 5. Fix common typos in domain-specific terms
  const typoFixes: Record<string, string> = {
    'awrds': 'awards',
    'awrd': 'award',
    'ecz': 'ecs',
    'extracurric': 'extracurricular',
    'colege': 'college',
    'collge': 'college',
    'scholship': 'scholarship',
    'scholrship': 'scholarship',
    'recomendation': 'recommendation',
    'recomend': 'recommend',
    'assesment': 'assessment',
    'gameplan': 'game plan',
    'readines': 'readiness',
    'prioritze': 'prioritize'
  };

  for (const [typo, correct] of Object.entries(typoFixes)) {
    const regex = new RegExp(typo, 'gi');
    normalized = normalized.replace(regex, correct);
  }

  // 6. Normalize arrow characters
  normalized = normalized.replace(/→/g, ' to ');
  normalized = normalized.replace(/->/g, ' to ');
  normalized = normalized.replace(/=>/g, ' to ');

  // 7. Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Extract numeric patterns from text for what-if analysis
 */
export function extractNumericPatterns(text: string): Array<{ from: number; to: number; type: string }> {
  const patterns: Array<{ from: number; to: number; type: string }> = [];

  // Pattern: "1430 to 1530", "1430->1530", "1430→1530"
  const rangeRegex = /(\d+)\s*(?:to|-|→|->|=>)\s*(\d+)/gi;
  let match;

  while ((match = rangeRegex.exec(text)) !== null) {
    const from = parseInt(match[1], 10);
    const to = parseInt(match[2], 10);

    // Determine type based on magnitude
    let type = 'unknown';
    if (from >= 400 && from <= 1600) type = 'sat';
    else if (from >= 1 && from <= 36) type = 'act';
    else if (from >= 0 && from <= 5) type = 'ap_score';
    else if (from >= 0 && from <= 4.5) type = 'gpa';

    patterns.push({ from, to, type });
  }

  return patterns;
}

/**
 * Detect language of query (simple heuristic)
 */
export function detectLanguage(text: string): 'en' | 'es' | 'other' {
  const normalized = text.toLowerCase();

  // Spanish indicators
  const spanishIndicators = [
    'qué', 'que', 'cuál', 'cual', 'cómo', 'como', 'cuándo', 'cuando',
    'dónde', 'donde', 'por favor', 'gracias', 'ayuda', 'necesito',
    'mi', 'mis', 'yo', 'tengo', 'soy', 'estoy'
  ];

  const spanishCount = spanishIndicators.filter(word =>
    normalized.includes(word)
  ).length;

  if (spanishCount >= 2) return 'es';

  // English is default
  return 'en';
}

/**
 * Translate common Spanish queries to English
 */
export function translateSpanishToEnglish(text: string): string {
  const translations: Record<string, string> = {
    'qué premios gané': 'what awards did i win',
    'cuáles son mis premios': 'what are my awards',
    'mis actividades': 'my activities',
    'mi gpa': 'my gpa',
    'qué universidad': 'which college',
    'ayuda': 'help',
    'necesito ayuda': 'i need help',
    'gracias': 'thank you'
  };

  let translated = text.toLowerCase();

  for (const [spanish, english] of Object.entries(translations)) {
    if (translated.includes(spanish)) {
      translated = translated.replace(spanish, english);
    }
  }

  return translated;
}

/**
 * Master normalization pipeline
 */
export function normalizeQuery(text: string): { normalized: string; language: string; patterns: any[] } {
  let normalized = text;

  // Detect language
  const language = detectLanguage(text);

  // Translate if Spanish
  if (language === 'es') {
    normalized = translateSpanishToEnglish(normalized);
  }

  // Apply text normalization
  normalized = normalizeText(normalized);

  // Extract numeric patterns
  const patterns = extractNumericPatterns(text);

  return {
    normalized,
    language,
    patterns
  };
}
