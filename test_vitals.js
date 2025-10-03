const vitals = {
  academics: {
    sat: {
      current: 1530,
      timeline: [
        {
          date: "2024-03-04T08:00:00.000Z",
          note: "Final SAT score from Common App",
          score: 1530
        }
      ],
      superscore: 1530
    }
  }
};

function satFromVitals(vitals) {
  const sat = vitals?.academics?.sat;
  if (\!sat) return null;
  const timeline = Array.isArray(sat.timeline) ? sat.timeline
    .filter((t) => t?.score)
    .map((t) => ({ date: t.date, score: t.score })) : [];
  const submitted = sat.submitted ?? null;
  return { timeline, submitted };
}

const result = satFromVitals(vitals);
console.log(JSON.stringify(result, null, 2));
console.log("Timeline length:", result.timeline.length);
console.log("Has submitted:", result.submitted \!== null);
