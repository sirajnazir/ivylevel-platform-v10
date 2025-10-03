// packages/scripts/src/lib/filename_time.ts
export type Grade = "freshman"|"sophomore"|"junior"|"senior";
export type Season = "fall"|"spring"|"summer"|"winter";

export type ParsedName = {
  week?: number;
  date_iso?: string;          // YYYY-MM-DD
  grade?: Grade;
  season?: Season;
  school_year?: string;       // e.g., "2023-24"
  phase?: string;             // "P1".."P5" if encoded in filename
  kind?: string;              // GAMEPLAN | TRANS-INTEL | EXEC-INTEL | IMSG-INTEL | APP-DOC
};

const GRADE_WORDS: Record<string, Grade> = {
  freshman: "freshman", frosh: "freshman",
  sophomore: "sophomore", soph: "sophomore",
  junior: "junior",
  senior: "senior",
};
const SEASON_WORDS: Record<string, Season> = {
  fall: "fall", autumn: "fall",
  spring: "spring",
  summer: "summer",
  winter: "winter",
};

export function parseFilenameTime(basename: string): ParsedName {
  const name = basename.replace(/\.[a-z0-9]+$/i, "");
  const out: ParsedName = {};

  const mDate =
    name.match(/(20\d{2})[._-](0[1-9]|1[0-2])[._-](0[1-9]|[12]\d|3[01])/)
    || name.match(/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  if (mDate) out.date_iso = `${mDate[1]}-${mDate[2]}-${mDate[3]}`;

  const mWeek = name.match(/(?:^|[^a-z])w(?:eek)?[-_ ]?(\d{1,3})/i);
  if (mWeek) out.week = parseInt(mWeek[1], 10);

  const mPhase = name.match(/(?:^|[^a-z])p([1-5])(?:[^a-z]|$)/i);
  if (mPhase) out.phase = `P${mPhase[1]}`;

  if (/gameplan/i.test(name)) out.kind = "GAMEPLAN";
  else if (/trans[-_ ]?intel/i.test(name)) out.kind = "TRANS-INTEL";
  else if (/exec[-_ ]?intel/i.test(name)) out.kind = "EXEC-INTEL";
  else if (/imsg[-_ ]?intel/i.test(name)) out.kind = "IMSG-INTEL";
  else if (/app[-_ ]?doc|common[-_ ]?app|uc[-_ ]?app/i.test(name)) out.kind = "APP-DOC";

  const lower = name.toLowerCase();
  for (const k of Object.keys(GRADE_WORDS)) if (lower.includes(k)) { out.grade = GRADE_WORDS[k]; break; }
  for (const k of Object.keys(SEASON_WORDS)) if (lower.includes(k)) { out.season = SEASON_WORDS[k]; break; }

  const mSY = name.match(/(20\d{2})[-_](\d{2,4})/);
  if (mSY) out.school_year = `${mSY[1]}-${(mSY[2].length === 2 ? mSY[2] : mSY[2].slice(-2))}`;

  return out;
}