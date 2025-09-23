import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export function generateId(): string {
  return uuidv4();
}

export function safeWriteFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, "utf8");
}

export function safeMkdir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function scrubPII(text: string): string {
  return text
    // Email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]")
    // Phone numbers (basic patterns)
    .replace(/\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, "[PHONE]")
    // Social Security Numbers
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]")
    // Credit card numbers (basic 4-4-4-4 pattern)
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[CARD]")
    // Address patterns (basic)
    .replace(/\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi, "[ADDRESS]");
}

export function tokenCount(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for English text
  // OpenAI's actual tokenizer is more complex, but this is good enough for validation
  return Math.ceil(text.length / 4);
}

export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...";
}

export function dedupe<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}