import { Evidence } from "./evidence.js";

export type OpportunityStage =
  | "captured"
  | "researched"
  | "challenged"
  | "validation"
  | "validated"
  | "rejected"
  | "building"
  | "verified";

export interface Opportunity {
  id: string;
  title: string;
  problem: string;
  customer: string;
  category?: string;
  geography?: string;
  existingSolutions: string[];
  differentiators: string[];
  evidence: Evidence[];
  stage: OpportunityStage;
  createdAt: string;
  updatedAt: string;
  validation: {
    customerConversations: number;
    waitlistSignups: number;
    trials: number;
    paidCustomers: number;
    paymentEvidence: number;
  };
}

export interface OpportunityAssessment {
  opportunityId: string;
  proof: number;
  pain: number;
  context: number;
  distribution: number;
  competitionEvidence: number;
  localGap: number;
  buildability: number;
  validation: number;
  evidenceCoverage: number;
  unresolvedRisks: string[];
  blockingUnknowns: string[];
}

export function assessOpportunity(o: Opportunity): OpportunityAssessment {
  const verified = o.evidence.filter(e => e.state === "VERIFIED");
  const payment = o.evidence.filter(
    e => e.kind === "revenue" || e.kind === "pricing" || e.kind === "customer"
  );
  const complaints = o.evidence.filter(e => e.kind === "complaint");
  const local = o.evidence.filter(e => e.kind === "local-gap");

  const average = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  const coverage = o.evidence.length
    ? verified.length / o.evidence.length
    : 0;

  const validation =
    Math.min(1, o.validation.customerConversations / 5) * 0.3 +
    Math.min(1, o.validation.waitlistSignups / 50) * 0.15 +
    Math.min(1, o.validation.trials / 10) * 0.15 +
    Math.min(1, o.validation.paidCustomers / 3) * 0.25 +
    Math.min(1, o.validation.paymentEvidence / 3) * 0.15;

  return {
    opportunityId: o.id,
    proof: Math.min(1, average(payment.map(e => e.confidence)) || 0),
    pain: Math.min(1, complaints.length / 5),
    context: 0,
    distribution: 0,
    competitionEvidence: Math.min(1, o.existingSolutions.length / 3),
    localGap: Math.min(1, local.length / 3),
    buildability: 0,
    validation,
    evidenceCoverage: coverage,
    unresolvedRisks: [],
    blockingUnknowns: o.evidence
      .filter(e => e.state === "UNKNOWN" || e.state === "STALE")
      .map(e => e.claim)
  };
}
