import type { AgentState } from "../../../packages/types/src/index";
import { runNode } from "./graph";

export async function respond({ message, coachId='jenny', studentId, nowWeek=1 }: { message:string; coachId?:string; studentId?:string; nowWeek?:number; }) {
  const state: AgentState = { coachId, studentId, nowWeek, phase: nowWeek <= 1 ? 1 : nowWeek <= 52 ? 2 : 5, memory: {} };
  return runNode(state, message);
}
