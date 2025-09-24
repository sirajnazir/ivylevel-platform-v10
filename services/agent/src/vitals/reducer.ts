export type Vitals = any;

export interface Observation {
  id: string;
  studentId: string;
  kind: string;
  subtype?: string | null;
  value: any;
  source: string;
  at: Date | string;
  createdAt: Date;
}

export function applyObservationToVitals(v: Vitals, o: Observation): Vitals {
  const out = JSON.parse(JSON.stringify(v || {}));

  switch (o.kind) {
    case "SAT": {
      const score = o.value?.score;
      const note = o.value?.note || "";
      const date = typeof o.at === 'string' ? o.at : o.at?.toISOString?.();
      out.academics ??= {};
      out.academics.sat ??= { current: null, superscore: null, timeline: [] };
      out.academics.sat.timeline.push({ date, score, note });
      out.academics.sat.timeline.sort((a: any, b: any) => a.date.localeCompare(b.date));
      const latest = out.academics.sat.timeline[out.academics.sat.timeline.length - 1];
      out.academics.sat.current = latest?.score ?? out.academics.sat.current;
      out.academics.sat.superscore = Math.max(...out.academics.sat.timeline.map((t: any) => t.score || 0));
      break;
    }
    case "GPA": {
      out.academics ??= {};
      out.academics.gpa ??= { weighted: null, unweighted: null, trend: null };
      if (o.value?.weighted != null) out.academics.gpa.weighted = o.value.weighted;
      if (o.value?.unweighted != null) out.academics.gpa.unweighted = o.value.unweighted;
      if (o.value?.trend != null) out.academics.gpa.trend = o.value.trend;
      break;
    }
    case "ACTIVITY": {
      out.activities ??= {};
      const key = (o.subtype || "activity").split(".")[0];
      out.activities[key] ??= {};
      out.activities[key].timeline ??= [];
      const date = typeof o.at === 'string' ? o.at : o.at?.toISOString?.();
      out.activities[key].timeline.push({ date, ...o.value });
      break;
    }
    case "AWARD": {
      out.awards ??= {};
      if (o.subtype === "targets") {
        out.awards.targets = o.value;
      } else {
        const key = (o.subtype || "award").split(".")[0];
        out.awards[key] ??= {};
        out.awards[key].status = o.value?.status || out.awards[key].status || "UNKNOWN";
        out.awards[key].date = typeof o.at === 'string' ? o.at : o.at?.toISOString?.() || out.awards[key].date;
      }
      break;
    }
    case "SUMMER": {
      out.summer ??= {};
      Object.assign(out.summer, o.value);
      break;
    }
    case "WELLNESS": {
      out.wellness ??= {};
      Object.assign(out.wellness, o.value);
      break;
    }
    case "TRAIT": {
      out.wellness ??= {};
      if (o.subtype === "style") {
        out.wellness.style = o.value;
      } else {
        out.traits ??= {};
        Object.assign(out.traits, o.value);
      }
      break;
    }
    case "APPS": {
      out.apps ??= {};
      
      if (o.subtype === "collegeList") {
        out.apps.collegeList = o.value?.colleges || [];
      } else if (o.subtype === "college-decision") {
        // Handle individual college decisions with precedence
        out.apps.collegeList ??= [];
        const college = o.value?.college;
        const decision = o.value?.decision;
        
        if (college && decision) {
          // Decision precedence: ACCEPTED > WAITLISTED/DEFERRED > REJECTED > UNKNOWN
          const RANK: Record<string, number> = { 
            ACCEPTED: 4, 
            WAITLISTED: 3, 
            DEFERRED: 3, 
            REJECTED: 2, 
            UNKNOWN: 1 
          };
          
          const existingIndex = out.apps.collegeList.findIndex((c: any) => 
            c.name?.toLowerCase() === college.toLowerCase() || 
            c.college?.toLowerCase() === college.toLowerCase()
          );
          
          if (existingIndex >= 0) {
            const existing = out.apps.collegeList[existingIndex];
            const existingRank = RANK[existing.status || existing.decision || "UNKNOWN"] || 0;
            const newRank = RANK[decision] || 0;
            
            // Only update if new decision has higher precedence
            if (newRank >= existingRank) {
              out.apps.collegeList[existingIndex] = {
                name: college,
                status: decision,
                round: o.value?.round || existing.round,
                date: o.value?.date || existing.date,
                notes: o.value?.notes || existing.notes
              };
            }
          } else {
            // Add new college
            out.apps.collegeList.push({
              name: college,
              status: decision,
              round: o.value?.round,
              date: o.value?.date,
              notes: o.value?.notes
            });
          }
        }
      } else if (o.subtype === "decisions") {
        out.apps.decisions = o.value;
      } else {
        Object.assign(out.apps, o.value);
      }
      break;
    }
    default:
      break;
  }
  return out;
}