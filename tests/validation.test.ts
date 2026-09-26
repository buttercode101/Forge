import test from "node:test";
import assert from "node:assert/strict";
import { validateOpportunity } from "../src/domain/validation.js";
import type { Opportunity } from "../src/domain/opportunity.js";

const base = (): Opportunity => ({
  id: "o1",
  title: "Example",
  problem: "Example problem",
  customer: "Example customer",
  existingSolutions: [],
  differentiators: [],
  evidence: [],
  stage: "validation",
  createdAt: "2026-09-26T00:00:00Z",
  updatedAt: "2026-09-26T00:00:00Z",
  validation: {
    customerConversations: 0,
    waitlistSignups: 0,
    trials: 0,
    paidCustomers: 0,
    paymentEvidence: 0
  }
});

test("does not validate an opportunity from an unverified claim", () => {
  const o = base();
  o.evidence.push({
    id: "e1",
    kind: "revenue",
    state: "CLAIMED",
    claim: "Founder says MRR is high",
    source: "social post",
    observedAt: "2026-09-26T00:00:00Z",
    confidence: 1
  });
  const gate = validateOpportunity(o);
  assert.equal(gate.pass, false);
  assert.ok(gate.requiredActions.length > 0);
});

test("requires unknown evidence to be resolved", () => {
  const o = base();
  o.validation.customerConversations = 3;
  o.validation.paidCustomers = 1;
  o.evidence.push({
    id: "e1",
    kind: "revenue",
    state: "VERIFIED",
    claim: "Payment received",
    source: "first-party payment record",
    observedAt: "2026-09-26T00:00:00Z",
    verifiedAt: "2026-09-26T00:00:00Z",
    confidence: 1
  });
  o.evidence.push({
    id: "e2",
    kind: "competitor",
    state: "UNKNOWN",
    claim: "Competitor pricing may have changed",
    source: "old source",
    observedAt: "2025-01-01T00:00:00Z",
    confidence: 0.8
  });

  assert.equal(validateOpportunity(o).pass, false);
});

test("passes with payment evidence, conversations, and no blocking unknowns", () => {
  const o = base();
  o.validation.customerConversations = 3;
  o.evidence.push({
    id: "e1",
    kind: "revenue",
    state: "VERIFIED",
    claim: "Payment received",
    source: "first-party payment record",
    observedAt: "2026-09-26T00:00:00Z",
    verifiedAt: "2026-09-26T00:00:00Z",
    confidence: 1
  });

  assert.equal(validateOpportunity(o).pass, true);
});


test("does not treat an unbacked paid-customer counter as payment proof", () => {
  const o = base();
  o.validation.customerConversations = 3;
  o.validation.paidCustomers = 1;
  assert.equal(validateOpportunity(o).pass, false);
});
