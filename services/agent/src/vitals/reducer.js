export function applyObservationToVitals(v, o) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const out = JSON.parse(JSON.stringify(v || {}));
    switch (o.kind) {
        case "SAT": {
            let score = null;
            // Handle different value formats
            if (typeof o.value === 'number') {
                score = o.value;
            }
            else if (typeof o.value === 'string' && /^\d+$/.test(o.value)) {
                score = parseInt(o.value);
            }
            else if (o.value?.value) {
                score = parseInt(o.value.value);
            }
            else if (o.value?.score) {
                score = o.value.score;
            }
            if (score && score >= 400 && score <= 1600) { // Valid SAT score range
                const note = o.value?.note || "";
                const date = typeof o.at === 'string' ? o.at : o.at?.toISOString?.();
                out.academics ?? (out.academics = {});
                (_a = out.academics).sat ?? (_a.sat = { current: null, superscore: null, timeline: [] });
                // Check if this date/score already exists
                const exists = out.academics.sat.timeline.some((t) => t.date === date && t.score === score);
                if (!exists) {
                    out.academics.sat.timeline.push({ date, score, note });
                    out.academics.sat.timeline.sort((a, b) => a.date.localeCompare(b.date));
                    const latest = out.academics.sat.timeline[out.academics.sat.timeline.length - 1];
                    out.academics.sat.current = latest?.score ?? out.academics.sat.current;
                    out.academics.sat.superscore = Math.max(...out.academics.sat.timeline.map((t) => t.score || 0));
                }
            }
            break;
        }
        case "GPA": {
            out.academics ?? (out.academics = {});
            (_b = out.academics).gpa ?? (_b.gpa = { weighted: null, unweighted: null, trend: null });
            if (o.value?.weighted != null)
                out.academics.gpa.weighted = o.value.weighted;
            if (o.value?.unweighted != null)
                out.academics.gpa.unweighted = o.value.unweighted;
            if (o.value?.trend != null)
                out.academics.gpa.trend = o.value.trend;
            break;
        }
        case "ACTIVITY": {
            out.activities ?? (out.activities = {});
            // Handle final ECs list
            if (o.subtype === "ACTIVITY.final" || o.subtype === "final") {
                out.activities.final = o.value;
            }
            else {
                const key = (o.subtype || "activity").split(".")[0];
                (_c = out.activities)[key] ?? (_c[key] = {});
                (_d = out.activities[key]).timeline ?? (_d.timeline = []);
                const date = typeof o.at === 'string' ? o.at : o.at?.toISOString?.();
                out.activities[key].timeline.push({ date, ...o.value });
            }
            break;
        }
        case "AWARD": {
            out.awards ?? (out.awards = {});
            // Handle final awards list
            if (o.subtype === "AWARD.final" || o.subtype === "final") {
                out.awards.final = o.value;
            }
            else if (o.subtype === "targets") {
                out.awards.targets = o.value;
            }
            else {
                const key = (o.subtype || "award").split(".")[0];
                (_e = out.awards)[key] ?? (_e[key] = {});
                // Award status precedence: WIN > FINALIST > NOMINATED > APPLIED > PLANNED
                const AWARD_RANK = {
                    WIN: 5,
                    FINALIST: 4,
                    NOMINATED: 3,
                    APPLIED: 2,
                    PLANNED: 1,
                    UNKNOWN: 0
                };
                const currentStatus = out.awards[key].status || "UNKNOWN";
                const newStatus = o.value?.status || "UNKNOWN";
                if (AWARD_RANK[newStatus] >= AWARD_RANK[currentStatus]) {
                    out.awards[key].status = newStatus;
                    out.awards[key].date = typeof o.at === 'string' ? o.at : o.at?.toISOString?.();
                    if (o.value?.details)
                        out.awards[key].details = o.value.details;
                }
            }
            break;
        }
        case "SUMMER": {
            out.summer ?? (out.summer = {});
            Object.assign(out.summer, o.value);
            break;
        }
        case "WELLNESS": {
            out.wellness ?? (out.wellness = {});
            Object.assign(out.wellness, o.value);
            break;
        }
        case "TRAIT": {
            out.wellness ?? (out.wellness = {});
            if (o.subtype === "style") {
                out.wellness.style = o.value;
            }
            else {
                out.traits ?? (out.traits = {});
                Object.assign(out.traits, o.value);
            }
            break;
        }
        case "APPS": {
            out.apps ?? (out.apps = {});
            if (o.subtype === "APPS.stats") {
                // Overall admission statistics
                out.apps.stats = o.value;
            }
            else if (o.subtype?.startsWith("APPS.decision.")) {
                // Individual college decisions
                (_f = out.apps).decisions ?? (_f.decisions = {});
                const schoolKey = o.subtype.replace("APPS.decision.", "");
                out.apps.decisions[schoolKey] = o.value;
                // Also update the collegeList for backward compatibility
                (_g = out.apps).collegeList ?? (_g.collegeList = []);
                const existingIndex = out.apps.collegeList.findIndex((c) => c.name?.toLowerCase() === o.value.school?.toLowerCase());
                const collegeEntry = {
                    name: o.value.school,
                    status: o.value.status,
                    program: o.value.program,
                    location: o.value.location,
                    acceptance_rate: o.value.acceptance_rate
                };
                if (existingIndex >= 0) {
                    out.apps.collegeList[existingIndex] = collegeEntry;
                }
                else {
                    out.apps.collegeList.push(collegeEntry);
                }
            }
            else if (o.subtype === "collegeList") {
                out.apps.collegeList = o.value?.colleges || [];
            }
            else if (o.subtype === "college-decision") {
                // Handle individual college decisions with precedence
                (_h = out.apps).collegeList ?? (_h.collegeList = []);
                const college = o.value?.college;
                const decision = o.value?.decision;
                if (college && decision) {
                    // Decision precedence: ACCEPTED > WAITLISTED/DEFERRED > REJECTED > UNKNOWN
                    const RANK = {
                        ACCEPTED: 4,
                        WAITLISTED: 3,
                        DEFERRED: 3,
                        REJECTED: 2,
                        UNKNOWN: 1
                    };
                    const existingIndex = out.apps.collegeList.findIndex((c) => c.name?.toLowerCase() === college.toLowerCase() ||
                        c.college?.toLowerCase() === college.toLowerCase());
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
                    }
                    else {
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
            }
            else if (o.subtype === "decisions") {
                out.apps.decisions = o.value;
            }
            else {
                Object.assign(out.apps, o.value);
            }
            break;
        }
        default:
            break;
    }
    return out;
}
