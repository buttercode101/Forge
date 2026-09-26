import test from "node:test";
import assert from "node:assert/strict";
import { synthesizeOpportunity, draftToOpportunity } from "../src/domain/synthesis.js";

const e = (id: string, kind: any, claim: string, state: any = "VERIFIED") => ({
  id, kind, claim, state, source: "test", observedAt: new Date().toISOString(), confidence: 0.9
});

test("synthesis keeps provenance and surfaces missing proof", () => {
  const draft = synthesizeOpportunity({
    query: "clinic reporting",
    geography: "South Africa",
    clusters: [],
    evidence: [
      e("p1", "complaint", "Clinics struggle to get reports quickly"),
      e("c1", "customer", "Independent clinics", "CLAIMED"),
      e("l1", "local-gap", "South African workflow is underserved")
    ]
  });

  assert.equal(draft.customer, "Independent clinics");
  assert.deepEqual(draft.supportingEvidenceIds, ["p1", "c1", "l1"]);
  assert.ok(draft.unresolvedQuestions.some(q => q.includes("pays")));
});

test("draft conversion never invents evidence", () => {
  const draft = synthesizeOpportunity({
    query: "x",
    evidence: [e("1", "complaint", "A real complaint")],
    clusters: []
  });
  const opportunity = draftToOpportunity(draft, [e("1", "complaint", "A real complaint"), e("2", "revenue", "Unrelated")]);
  assert.deepEqual(opportunity.evidence.map(x => x.id), ["1"]);
  assert.equal(opportunity.stage, "captured");
});
