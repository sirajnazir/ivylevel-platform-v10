const FORBIDDEN = [
  /i don['']?t have access/gi,
  /i cannot access/gi,
  /as an ai/gi,
  /i don['']?t know/gi,
  /i'm here to provide guidance/gi,
  /i can't access your specific/gi,
  /unfortunately, i can't/gi
];

export function finalizeFactReply(text: string, hasChips: boolean): string {
  let t = (text || "").replace(/\s+/g, " ").trim();
  
  // Remove all forbidden phrases
  FORBIDDEN.forEach(rx => t = t.replace(rx, "").trim());
  
  // If the response is now too short or empty, provide a better one
  if (!t || t.length < 8) {
    t = hasChips
      ? "Based on our records from your shared documents (see evidence above), here's what I found."
      : "I don't see this recorded in our session notes yet. Would you like me to check your application PDFs or add it to your profile now?";
  }
  
  // Ensure we have a substantive response
  if (t.length < 50 && hasChips) {
    t = "Let me check our records... " + t;
  }
  
  return t;
}

export function isFactualQuestion(message: string): boolean {
  const factualPatterns = [
    /what (is|was|were) (my|the)/i,
    /when did/i,
    /how many/i,
    /score/i,
    /result/i,
    /date/i,
    /deadline/i,
    /submit/i,
    /final/i,
    /outcome/i
  ];
  
  return factualPatterns.some(pattern => pattern.test(message));
}