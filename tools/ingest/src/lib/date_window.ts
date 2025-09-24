export function extractNearbyDate(text: string, lineIdx: number, lines: string[], window=4): string | undefined {
  for (let d = -window; d <= window; d++) {
    const idx = lineIdx + d;
    if (idx < 0 || idx >= lines.length) continue;
    const m = lines[idx].match(/\b([A-Za-z]{3,9}\.? \d{1,2},? \d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/);
    if (m) return m[1];
  }
  return;
}