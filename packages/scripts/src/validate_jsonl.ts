/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import minimist from "minimist";

type Msg = { role: "system"|"user"|"assistant"; content: string };
type Ex = { messages: Msg[] };

const args = minimist(process.argv.slice(2));
const file = args._[0] || args.file;
if (!file) {
  console.error("Usage: pnpm --filter @packages/scripts run validate:jsonl <path/to/file.jsonl>");
  process.exit(1);
}
const abs = path.resolve(process.cwd(), file);
if (!fs.existsSync(abs)) {
  console.error("Not found:", abs);
  process.exit(1);
}
const lines = fs.readFileSync(abs, "utf8").split(/\n/).filter(Boolean);

let ok=0, bad=0;
for (let i=0;i<lines.length;i++){
  try {
    const ex:Ex = JSON.parse(lines[i]);
    if (!Array.isArray(ex.messages) || ex.messages.length < 2) throw new Error("messages missing/too short");
    const roles = ex.messages.map(m=>m.role);
    if (!roles.includes("user") || !roles.includes("assistant")) throw new Error("must include user and assistant");
    if (ex.messages.some(m => typeof m.content !== "string" || m.content.trim().length === 0)) throw new Error("empty content");
    ok++;
  } catch (e:any) {
    bad++;
    console.error(`Line ${i+1}: ${e.message}`);
  }
}
console.log(`validate_jsonl: ok=${ok} bad=${bad} file=${file}`);
process.exit(bad>0 ? 2 : 0);