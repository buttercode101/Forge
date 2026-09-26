import { Opportunity, OpportunityStage } from "./opportunity.js";

const transitions: Record<OpportunityStage, OpportunityStage[]> = {
  captured: ["researched", "rejected"],
  researched: ["challenged", "rejected"],
  challenged: ["validation", "rejected"],
  validation: ["validated", "rejected", "researched"],
  validated: ["building", "rejected"],
  rejected: [],
  building: ["verified", "rejected"],
  verified: []
};

export function canTransition(from: OpportunityStage, to: OpportunityStage): boolean {
  return transitions[from].includes(to);
}

export function transition(o: Opportunity, to: OpportunityStage): Opportunity {
  if (!canTransition(o.stage, to)) {
    throw new Error(`Invalid opportunity transition: ${o.stage} -> ${to}`);
  }
  return { ...o, stage: to, updatedAt: new Date().toISOString() };
}
