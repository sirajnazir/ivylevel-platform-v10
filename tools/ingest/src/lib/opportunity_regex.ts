export const APPLY_PAT = /\b(apply|application|submit|submitting|turn in|deadline|due by|opens|opens on)\b/i;
export const ACCEPT_PAT = /\b(accept(ed|ance)?|admit(ted)?|won|selected|national(?!\s*merit) )\b/i;
export const REJECT_PAT = /\b(reject(ed|ion)?|didn'?t get|declined)\b/i;
export const WAITLIST_PAT = /\b(waitlist(ed)?|on the waitlist)\b/i;
export const DEADLINE_PAT = /\b(deadline|due|due by|closes|apply by|submit by)\b[:\s]*([A-Za-z]{3,9}\.? \d{1,2},? \d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i;
// loose opportunity name token (capitalized or known alias tokens)
export const OPP_NAME_PAT = /\b([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,4}|NCWIT|JCamp|YYGS|MITES|COSMOS|NASA|KWC|GWC)\b/;