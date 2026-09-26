import { evidenceConfidence } from "./evidence.js";
import { Opportunity } from "./opportunity.js";

export interface ValidationGate {
  pass: boolean;
  reasons: string[];
  requiredActions: string[];
}

export function validateOpportunity(o: Opportunity): ValidationGate {
  const reasons: string[] = [];
  const requiredActions: string[] = [];

  const verifiedPayment = o.evidence.filter(
    e => e.state === "VERIFIED" &&
      (e.kind === "revenue" || e.kind === "pricing" || e.kind === "customer") &&
      evidenceConfidence(e) >= 0.7
  );

  const verifiedCustomerSignals = o.evidence.filter(
    e => e.state === "VERIFIED" && e.kind === "customer"
  );

  if (verifiedPayment.length === 0 && o.validation.paidCustomers === 0) {
    requiredActions.push("Obtain verified payment or customer evidence before treating demand as validated.");
  }

  if (o.validation.customerConversations < 3) {
    requiredActions.push("Complete at least three direct customer/problem conversations.");
  }

  if (o.evidence.some(e => e.state === "UNKNOWN")) {
    requiredActions.push("Resolve UNKNOWN evidence that could change the opportunity decision.");
  }

  if (o.evidence.some(e => e.state === "STALE")) {
    requiredActions.push("Refresh stale evidence before relying on it.");
  }

  if (verifiedCustomerSignals.length > 0) reasons.push("Verified customer evidence exists.");
  if (verifiedPayment.length > 0 || o.validation.paidCustomers > 0) reasons.push("There is evidence of payment behavior.");

  const pass =
    (verifiedPayment.length > 0 || o.validation.paidCustomers > 0) &&
    o.validation.customerConversations >= 3 &&
    !o.evidence.some(e => e.state === "UNKNOWN") &&
    !o.evidence.some(e => e.state === "STALE");

  return { pass, reasons, requiredActions };
}
