import test from "node:test";
import assert from "node:assert/strict";
import { harvest } from "../src/domain/harvest.js";
import { SourceAdapter } from "../src/domain/source.js";

const adapter = (id: string, reliability: number, signals: Parameters<SourceAdapter["collect"]> extends [string] ? Awaited<ReturnType<SourceAdapter["collect"]>> : never, fail = false): SourceAdapter => ({
  definition: {
    id,
    type: "community",
    name: id,
    reliability,
    supports: ["pain"]
  },
  async collect() {
    if (fail) throw new Error("source unavailable");
    return signals;
  }
});

test("harvest isolates source failure and deduplicates signals", async () => {
  const signal = {
    id: "1",
    source: "community",
    kind: "complaint" as const,
    title: "Repeated pain",
    text: "Exporting reports is painful",
    observedAt: new Date().toISOString(),
    url: "https://example.test/1"
  };

  const report = await harvest("reporting", [
    adapter("a", 0.7, [signal]),
    adapter("b", 0.8, [signal]),
    adapter("broken", 0.9, [], true)
  ]);

  assert.equal(report.sourceCount, 3);
  assert.equal(report.successfulSources, 2);
  assert.equal(report.signals.length, 1);
  assert.equal(report.duplicateSignalsRemoved, 1);
  assert.equal(report.evidence[0].confidence, 0.7);
  assert.equal(report.failures.length, 1);
});
