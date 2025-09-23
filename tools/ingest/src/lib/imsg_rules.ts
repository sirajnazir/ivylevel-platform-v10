export const IMSG_TIMESTAMP_RE =
  /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+[A-Z][a-z]{2}\s+\d{1,2}\s+at\s+\d{1,2}:\d{2}(?:AM|PM)/i;

// some exports looked like: "Fri, Mar 1 at 7:17PM …"
export const IMSG_TS_ALT =
  /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+[A-Z][a-z]{2}\s+\d{1,2}\s+at\s+\d{1,2}:\d{2}\s*(?:AM|PM)/i;

// fallback if month words dropped:
export const IMSG_DAYONLY =
  /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+at\s+\d{1,2}:\d{2}(?:AM|PM)?/i;

export const COACH_ALIASES =
  (process.env.SPEAKER_COACH_ALIASES || "jenny,jenny duan,coach,mentor,ivy mentors")
  .split(",").map(s => s.trim().toLowerCase());

export const STUDENT_ALIASES =
  (process.env.SPEAKER_STUDENT_ALIASES || "huda,student,mentee,heather")
  .split(",").map(s => s.trim().toLowerCase());

// lightweight hints
export const COACH_HINTS = [
  /let['']s/, /please/, /email|send|schedule/, /here['']s/, /do this/, /we will/,
  /first.*then/, /1\)|2\)|3\)/, /great job|proud|awesome/i
];

export const STUDENT_HINTS = [
  /\bi\b.*\b(my|me)\b/i, /\bgot\b|\bapplied\b|\bsubmitted\b|\brejected\b|\bwaitlisted\b/i,
  /here is my draft/i, /im really|i'm really/i
];