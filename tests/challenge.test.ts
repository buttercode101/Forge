import test from "node:test";
import assert from "node:assert/strict";
import { generateChallenges } from "../src/domain/challenge.js";

test("challenge generation asks for payment proof before validation", () => {
  const now = new Date().toISOString();
  const challenges = generateChallenges({
    id: "o1",
    title: "Example",
    problem: "Pain",
    customer: "Customer",
    existingSolutions: [],
    differentiators: [],
    evidence: [],
    stage: "researched",
    createdAt: now,
    updatedAt: now,
    validation: {
      customerConversations: 0,
      waitlistSignups: 0,
      trials: 0,
      paidCustomers: 0,
      paymentEvidence: 0
    }
  });

  assert.ok(challenges.some(c => c.id === "payment-proof" && c.severity === "blocking"));
  assert.ok(challenges.some(c => c.id === "pain-proof"));
  assert.ok(challenges.some(c => c.id === "wedge"));
});
