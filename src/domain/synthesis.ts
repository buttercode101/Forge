import { Evidence, evidenceConfidence } from "./evidence.js";
import { Opportunity } from "./opportunity.js";
import { SignalCluster } from "./ingestion.js";

export interface SynthesisInput {
  query: string;
  evidence: Evidence[];
  clusters: SignalCluster[];
  geography?: string;
}

export interface OpportunityDraft {
  title: string;
  problem: string;
  customer: string;
  category?: string;
  geography?: string;
  existingSolutions: string[];
  differentiators: string[];
  supportingEvidenceIds: string[];
  unresolvedQuestions: string[];
  rationale: string[];
}

function topEvidence(evidence: Evidence[], kind?: Evidence["kind"]): Evidence[] {
  return evidence
    .filter(e => !kind || e.kind === kind)
    .sort((a, b) => evidenceConfidence(b) - evidenceConfidence(a))
    .slice(0, 5);
}

export function synthesizeOpportunity(input: SynthesisInput): OpportunityDraft {
  const pain = topEvidence(input.evidence, "complaint");
  const competition = topEvidence(input.evidence, "competitor");
  const local = topEvidence(input.evidence, "local-gap");
  const commercial = [
    ...topEvidence(input.evidence, "revenue"),
    ...topEvidence(input.evidence, "pricing"),
    ...topEvidence(input.evidence, "customer")
  ].slice(0, 5);

  const supporting = [...pain, ...commercial, ...competition, ...local]
    .filter((e, index, all) => all.findIndex(x => x.id === e.id) === index);

  const customer = inferCustomer(input.evidence) ?? "Customer segment requires direct validation.";
  const problem = pain[0]?.claim ?? input.query;
  const category = competition[0]?.claim;

  const unresolvedQuestions: string[] = [];
  if (!commercial.some(e => e.state === "VERIFIED")) {
    unresolvedQuestions.push("Who demonstrably pays for this outcome or category?");
  }
  if (pain.length < 2) {
    unresolvedQuestions.push("Can the pain be corroborated by multiple independent sources?");
  }
  if (!competition.length) {
    unresolvedQuestions.push("What existing solution or substitute establishes the category?");
  }
  if (!input.geography) {
    unresolvedQuestions.push("Which geography has the clearest underserved wedge?");
  }

  return {
    title: makeTitle(problem),
    problem,
    customer,
    category,
    geography: input.geography,
    existingSolutions: competition.map(e => e.claim),
    differentiators: local.map(e => e.claim),
    supportingEvidenceIds: supporting.map(e => e.id),
    unresolvedQuestions,
    rationale: [
      ...pain.map(e => `Pain signal: ${e.claim}`),
      ...commercial.map(e => `Commercial signal: ${e.claim}`),
      ...local.map(e => `Local gap: ${e.claim}`)
    ]
  };
}

function inferCustomer(evidence: Evidence[]): string | undefined {
  const customer = evidence.find(e => e.kind === "customer");
  return customer?.claim;
}

function makeTitle(problem: string): string {
  const cleaned = problem.replace(/[.!?]+$/, "").trim();
  return cleaned.length > 72 ? `${cleaned.slice(0, 69)}...` : cleaned;
}

export function draftToOpportunity(
  draft: OpportunityDraft,
  evidence: Evidence[]
): Opportunity {
  const now = new Date().toISOString();
  const supporting = new Set(draft.supportingEvidenceIds);

  return {
    id: crypto.randomUUID(),
    title: draft.title,
    problem: draft.problem,
    customer: draft.customer,
    category: draft.category,
    geography: draft.geography,
    existingSolutions: draft.existingSolutions,
    differentiators: draft.differentiators,
    evidence: evidence.filter(e => supporting.has(e.id)),
    stage: "captured",
    createdAt: now,
    updatedAt: now,
    validation: {
      customerConversations: 0,
      waitlistSignups: 0,
      trials: 0,
      paidCustomers: 0,
      paymentEvidence: 0
    }
  };
}
