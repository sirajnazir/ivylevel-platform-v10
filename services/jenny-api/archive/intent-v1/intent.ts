export type TemporalSelector = 'first'|'earliest'|'last'|'latest'|'min'|'max'|undefined;
export type Modality = 'official'|'practice'|'any';

export function extractTemporalAndModality(utterance: string): { temporal: TemporalSelector; modality: Modality } {
  const u = utterance.toLowerCase();

  // temporal
  const temporal: TemporalSelector =
    /\b(first|earliest|initial|baseline|diagnostic|beginning)\b/.test(u) ? 'earliest' :
    /\b(last|latest|final|most recent|recent)\b/.test(u) ? 'latest' :
    undefined;

  // optional min/max words
  if (/\blowest|min(imum)?\b/.test(u)) return { temporal: 'min', modality: 'any' };
  if (/\bhighest|max(imum)?\b/.test(u)) return { temporal: 'max', modality: 'any' };

  // modality
  const modality: Modality =
    /\b(practice|mock|diagnostic|sample|proctored practice)\b/.test(u) ? 'practice' :
    /\b(official|reported|collegeboard|cb score|final)\b/.test(u) ? 'official' :
    'any';

  return { temporal, modality };
}