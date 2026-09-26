import { Evidence, evidenceConfidence } from "./evidence.js";

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

const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

export function assessOpportunity(o: Opportunity): OpportunityAssessment {
  const payment = o.evidence.filter(e =>
    e.kind === "revenue" || e.kind === "pricing" || e.kind === "customer"
  );
  const complaints = o.evidence.filter(e => e.kind === "complaint");
  const customer = o.evidence.filter(e => e.kind === "customer");
  const local = o.evidence.filter(e => e.kind === "local-gap");
  const competitors = o.evidence.filter(e => e.kind === "competitor");

  const proof = average(payment.map(evidenceConfidence));
  const pain = Math.min(1, average(complaints.map(evidenceConfidence)) || 0);
  const localGap = Math.min(1, average(local.map(evidenceConfidence)) || 0);
  const competitionEvidence = Math.min(
    1,
    Math.max(o.existingSolutions.length / 3, average(competitors.map(evidenceConfidence)) || 0)
  );
  const evidenceCoverage = average(o.evidence.map(evidenceConfidence));

  const context = Math.min(
    1,
    (o.customer.trim() ? 0.5 : 0) +
    (o.category?.trim() ? 0.25 : 0) +
    (o.geography?.trim() ? 0.25 : 0)
  );
  const distribution = Math.min(
    1,
    (o.existingSolutions.length ? 0.4 : 0) +
    (customer.length ? 0.3 : 0) +
    (o.geography?.trim() ? 0.3 : 0)
  );
  const buildability = Math.min(
    1,
    (o.problem.trim() ? 0.4 : 0) +
    (o.customer.trim() ? 0.3 : 0) +
    (o.differentiators.length ? 0.3 : 0)
  );

  const validation =
    Math.min(1, o.validation.customerConversations / 5) * 0.3 +
    Math.min(1, o.validation.waitlistSignups / 50) * 0.15 +
    Math.min(1, o.validation.trials / 10) * 0.15 +
    Math.min(1, o.validation.paidCustomers / 3) * 0.25 +
    Math.min(1, o.validation.paymentEvidence / 3) * 0.15;

  const unresolvedRisks: string[] = [];
  if (!o.customer.trim()) unresolvedRisks.push("Customer segment is undefined.");
  if (!o.problem.trim()) unresolvedRisks.push("Problem statement is undefined.");
  if (!o.existingSolutions.length && !competitors.length) unresolvedRisks.push("No category or substitute evidence.");
  if (!o.differentiators.length && !local.length) unresolvedRisks.push("No differentiated wedge is documented.");
  if (!payment.length) unresolvedRisks.push("No commercial evidence is recorded.");

  return {
    opportunityId: o.id,
    proof,
    pain,
    context,
    distribution,
    competitionEvidence,
    localGap,
    buildability,
    validation,
    evidenceCoverage,
    unresolvedRisks,
    blockingUnknowns: o.evidence
      .filter(e => e.state === "UNKNOWN" || e.state === "STALE")
      .map(e => e.claim)
  };
}
