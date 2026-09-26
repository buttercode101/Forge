import test from "node:test";
import assert from "node:assert/strict";
import { canTransition, transition } from "../src/domain/pipeline.js";
import { evidenceConfidence } from "../src/domain/evidence.js";
import { assessOpportunity } from "../src/domain/opportunity.js";

test("evidence state changes effective confidence", () => {
  const base = {
    id: "e1",
    kind: "revenue" as const,
    claim: "Customers pay",
    source: "source",
    observedAt: new Date().toISOString(),
    confidence: 1
  };

  assert.equal(evidenceConfidence({...base, state: "VERIFIED"}), 1);
  assert.equal(evidenceConfidence({...base, state: "CLAIMED"}), 0.55);
  assert.equal(evidenceConfidence({...base, state: "UNKNOWN"}), 0.15);
});

test("opportunity pipeline blocks arbitrary jumps", () => {
  assert.equal(canTransition("captured", "researched"), true);
  assert.equal(canTransition("captured", "validated"), false);
});

test("valid transition updates stage and timestamp", () => {
  const o = {
    id: "o1",
    title: "Test",
    problem: "Pain",
    customer: "Customer",
    existingSolutions: [],
    differentiators: [],
    evidence: [],
    stage: "captured" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    validation: {
      customerConversations: 0,
      waitlistSignups: 0,
      trials: 0,
      paidCustomers: 0,
      paymentEvidence: 0
    }
  };
  const next = transition(o, "researched");
  assert.equal(next.stage, "researched");
  assert.ok(next.updatedAt);
});

test("assessment exposes blocking unknowns", () => {
  const now = new Date().toISOString();
  const o = {
    id: "o1",
    title: "Test",
    problem: "Pain",
    customer: "Customer",
    existingSolutions: ["Existing"],
    differentiators: [],
    evidence: [{
      id: "e1",
      kind: "complaint" as const,
      state: "UNKNOWN" as const,
      claim: "Needs validation",
      source: "source",
      observedAt: now,
      confidence: 0.5
    }],
    stage: "researched" as const,
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
  const assessment = assessOpportunity(o);
  assert.deepEqual(assessment.blockingUnknowns, ["Needs validation"]);
});
