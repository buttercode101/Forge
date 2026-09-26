import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OpportunityService } from "../src/application/opportunity-service.js";
import { OpportunityStore } from "../src/store/opportunity-store.js";

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "forge-"));
  const store = new OpportunityStore(join(dir, "state.json"));
  const now = new Date().toISOString();
  await store.add({
    id: "o1",
    title: "Test",
    problem: "Pain",
    customer: "Customer",
    existingSolutions: [],
    differentiators: [],
    evidence: [],
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
  });
  return store;
}

test("service persists evidence and clamps confidence", async () => {
  const store = await fixture();
  const service = new OpportunityService(store);
  await service.addEvidence("o1", {
    kind: "revenue",
    claim: "Customers pay",
    source: "marketplace",
    confidence: 4
  });

  const state = await store.load();
  assert.equal(state.opportunities[0].evidence.length, 1);
  assert.equal(state.opportunities[0].evidence[0].confidence, 1);
  assert.equal(state.opportunities[0].evidence[0].state, "CLAIMED");
});

test("service rejects invalid validation counters", async () => {
  const store = await fixture();
  const service = new OpportunityService(store);
  await assert.rejects(() =>
    service.updateValidation("o1", { paidCustomers: -1 })
  );
});

test("service enforces the pipeline", async () => {
  const store = await fixture();
  const service = new OpportunityService(store);
  await service.transition("o1", "researched");
  await assert.rejects(() => service.transition("o1", "validated"));
});
