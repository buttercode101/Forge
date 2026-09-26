import { Opportunity } from "./opportunity.js";

export interface Challenge {
  id: string;
  question: string;
  severity: "blocking" | "material" | "minor";
  status: "open" | "resolved";
  evidenceRequired: string[];
}

export function generateChallenges(o: Opportunity): Challenge[] {
  const challenges: Challenge[] = [];

  if (!o.evidence.some(e => e.kind === "revenue" || e.kind === "customer")) {
    challenges.push({
      id: "payment-proof",
      question: "Is there credible evidence that anyone pays for this category or outcome?",
      severity: "blocking",
      status: "open",
      evidenceRequired: ["verified revenue, pricing, or customer evidence"]
    });
  }

  if (o.existingSolutions.length === 0) {
    challenges.push({
      id: "category-proof",
      question: "Does an existing category or substitute already solve enough of this problem to establish demand?",
      severity: "material",
      status: "open",
      evidenceRequired: ["competitor, substitute, or customer workflow evidence"]
    });
  }

  if (!o.evidence.some(e => e.kind === "complaint")) {
    challenges.push({
      id: "pain-proof",
      question: "What evidence demonstrates that the problem is painful rather than merely annoying?",
      severity: "material",
      status: "open",
      evidenceRequired: ["repeated customer pain evidence"]
    });
  }

  if (!o.differentiators.length) {
    challenges.push({
      id: "wedge",
      question: "What specific underserved segment, workflow, geography, or execution advantage creates a wedge?",
      severity: "material",
      status: "open",
      evidenceRequired: ["documented gap or differentiated workflow"]
    });
  }

  return challenges;
}
