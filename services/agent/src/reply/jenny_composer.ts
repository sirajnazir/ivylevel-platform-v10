import { ExtractedFacts } from "../facts/fact_synthesizer";

export function composeJennyReply(message: string, facts: ExtractedFacts, opts: { persona: string }) {
  const L: string[] = [];
  const isJenny = opts.persona === "jenny";

  // Use specific award arrays if available, fall back to gameplanLists
  const initialAwards = facts?.awardsInitial || (facts as any)?._sources?.initialAwards || [];
  const finalAwards = facts?.awardsWon || (facts as any)?._sources?.finalAwards || [];
  const awards = facts?.gameplanLists?.awards || finalAwards || initialAwards || [];
  
  const comp = (facts as any)?.comparison as { achieved?: string[]; plannedNotAchieved?: string[]; extras?: string[] } | null;

  const hasSat = facts?.satTimeline?.length;

  if (isJenny) L.push("Love that you're tracking this — here's the crisp readout 👇");

  // Comparison block if requested
  if (comp) {
    L.push("");
    L.push("**Initial plan vs. actual wins (awards):**");
    L.push("");
    L.push(`**Achieved from plan (${comp.achieved?.length || 0}):**`);
    if (comp.achieved?.length) comp.achieved.forEach((a, i) => L.push(`${i+1}. ${a}`)); else L.push("—");
    L.push("");
    L.push(`**Still open from plan (${comp.plannedNotAchieved?.length || 0}):**`);
    if (comp.plannedNotAchieved?.length) comp.plannedNotAchieved.forEach((a, i) => L.push(`${i+1}. ${a}`)); else L.push("—");
    L.push("");
    L.push(`**Additional wins not in the original plan (${comp.extras?.length || 0}):**`);
    if (comp.extras?.length) comp.extras.forEach((a, i) => L.push(`${i+1}. ${a}`)); else L.push("—");

    if (isJenny) {
      L.push("");
      L.push("_Next: I can pick 2 quick targets to close from the 'still open' list — want me to queue them?_");
    }
  } else if (awards.length || initialAwards.length || finalAwards.length) {
    L.push("");
    
    // Determine which awards to show based on context
    let awardsToShow = awards;
    let header = "**Awards (closest match):**";
    
    if (/initial/i.test(message) && /game\s*plan/i.test(message) && initialAwards.length) {
      awardsToShow = initialAwards;
      header = "**Initial GamePlan awards:**";
    } else if (/final|actually won|won so far/i.test(message) && finalAwards.length) {
      awardsToShow = finalAwards;
      header = "**Awards you've actually won:**";
    }
    
    L.push(header);
    awardsToShow.slice(0, 20).forEach((a: string, i: number) => L.push(`${i+1}. ${a}`));

    if (isJenny) {
      L.push("");
      L.push("_Proud of this. If you want, I'll map these to your narrative + add 2 stretch targets._");
    }
  }

  // SAT section
  if (hasSat) {
    const timeline = [...(facts.satTimeline || [])].sort((a,b)=> (a.date||"").localeCompare(b.date||""));
    const chain = timeline.map(s => `${s.date ? `${s.date}: ` : ""}${s.score}`).join(" → ");
    L.push("");
    L.push("**SAT progression:**");
    L.push(chain || "—");
    if (typeof facts.satSubmitted === "number") {
      L.push(`**Submitted score:** ${facts.satSubmitted}`);
    }
    if (isJenny) {
      L.push("");
      L.push("_If you'd like, I'll line-up a micro-plan for the next +20 improvement or confirm the submission log._");
    }
  }

  // If nothing above, gentle fallback (should be rare now)
  if (L.length === 0) {
    return isJenny
      ? "I'm on it — give me a nudge if you want me to pull the exact doc name while I fetch the specifics."
      : "Working on it.";
  }

  return L.join("\n");
}