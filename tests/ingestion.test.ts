import test from "node:test";
import assert from "node:assert/strict";
import { clusterSignals, normalizeSignal } from "../src/domain/ingestion.js";

test("normalizes raw signals into traceable claimed evidence", () => {
  const evidence = normalizeSignal({
    id: "s1",
    source: "marketplace",
    kind: "customer",
    title: "Review",
    text: "Customers need exports",
    observedAt: "2026-09-26T00:00:00Z",
    url: "https://example.com/review"
  });

  assert.equal(evidence.state, "CLAIMED");
  assert.match(evidence.source, /https:\/\/example\.com/);
});

test("clusters repeated signals without claiming validation", () => {
  const signals = [
    { id: "1", source: "a", kind: "complaint" as const, title: "A", text: "slow exports from dashboard", observedAt: "2026-09-26T00:00:00Z" },
    { id: "2", source: "b", kind: "complaint" as const, title: "B", text: "slow exports from dashboard", observedAt: "2026-09-26T00:00:00Z" }
  ];

  const clusters = clusterSignals(signals);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].signals.length, 2);
  assert.match(clusters[0].repeatedPain, /2 signals/);
});
