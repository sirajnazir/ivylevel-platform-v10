export function compareAwardSets(initial: string[] = [], actual: string[] = []) {
  const norm = (a: string) => a.toLowerCase().replace(/\s+/g," ").trim();

  const iSet = new Map<string,string>(); 
  initial.forEach(x => iSet.set(norm(x), x));
  
  const aSet = new Map<string,string>(); 
  actual.forEach(x => aSet.set(norm(x), x));

  const achieved: string[] = [];
  const plannedNotAchieved: string[] = [];
  const extras: string[] = [];

  for (const [k, val] of iSet) {
    if (aSet.has(k)) achieved.push(val);
    else plannedNotAchieved.push(val);
  }
  for (const [k, val] of aSet) {
    if (!iSet.has(k)) extras.push(val);
  }

  return { achieved, plannedNotAchieved, extras };
}