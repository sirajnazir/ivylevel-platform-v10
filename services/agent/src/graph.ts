import type { AgentState } from "../../../packages/types/dist";

export async function runNode(state: AgentState, message: string) {
  // Placeholder for real LangGraph integration.
  const phase = state.phase || 1;
  if (phase === 1) return { reply: "Running Assessment (4-Step) and drafting GamePlan in 24h.", state: { ...state, phase: 2 } };
  if (phase === 2) return { reply: "Executing 168h planning: remove 7h social, add 2 award apps.", state: { ...state, phase: 3 } };
  return { reply: "Applications sprint: narrative polish + evidence citing prior sessions.", state: { ...state, phase: 5 } };
}
