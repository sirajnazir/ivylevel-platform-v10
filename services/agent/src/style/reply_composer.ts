import type { ExtractedFacts } from "../facts/fact_synthesizer";
import type { UserIntent } from "../intent";

export function composeJennyReply(intent: UserIntent, facts: ExtractedFacts): string {
  const openings = [
    "Love that you're tracking this — here's what I'm seeing:",
    "I've got you. Quick readout:",
    "Great question. Pulling from your records:",
  ];
  const open = openings[Math.floor(Math.random()*openings.length)];

  // Awards — initial vs actual
  if (intent.topic === "awards") {
    if (intent.timeframe === "initial" && facts.awardsInitial?.length) {
      const list = facts.awardsInitial.map((a,i)=>`${i+1}. ${a}`).join("\n");
      return `${open}\n\n**Initial GamePlan awards (Assessment Week 0):**\n${list}\n\nWe built this to balance Aptitude, Passion, and Community impact. We'll keep tuning as you progress.`;
    }

    if (intent.timeframe === "actual") {
      if (facts.awardsWon?.length) {
        const list = facts.awardsWon.map((a,i)=>`${i+1}. ${a}`).join("\n");
        const tail = facts.awardsCounts?.total ? `\n\nTally: ${facts.awardsCounts.total} total (acad: ${facts.awardsCounts.academic ?? "?"}, community: ${facts.awardsCounts.community ?? "?"}).` : "";
        return `${open}\n\n**Awards you've actually won:**\n${list}${tail}\n\n🔥 Proud of this — and we're not done. Want me to line up two next targets to keep the momentum?`;
      }
      if (facts.awardsCounts?.total) {
        return `${open}\n\nYou have **${facts.awardsCounts.total}** recorded awards (academic: ${facts.awardsCounts.academic ?? "?"}, community: ${facts.awardsCounts.community ?? "?"}). I don't see all names in the records — want me to fetch the final outcomes doc and pull the exact list?`;
      }
    }
  }

  // Default fallback with warmth
  return `${open}\n\nHere's what I found: ${JSON.stringify(facts, null, 2)}\n\nIf you want, I can dig into the source docs and extract more detail.`;
}