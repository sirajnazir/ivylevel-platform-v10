// shared/intent.ts
export function isInitialIntent(message: string) {
  const m = (message || "").toLowerCase();
  return /(initial|first|week 0|week0|w0|game\s*plan|gameplan|assessment)/i.test(m);
}

export function isAwardsTopic(message: string) {
  return /\b(award|awards|honor|honors|achievement|achievements)\b/i.test(message);
}

export function isECsTopic(message: string) {
  return /\b(ec|ecs|activities|extracurriculars?)\b/i.test(message);
}