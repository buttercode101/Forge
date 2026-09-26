import { RawSignal, normalizeSignal } from "./ingestion.js";
import { Evidence } from "./evidence.js";
import { SourceAdapter, SourceDefinition } from "./source.js";

export interface HarvestFailure {
  sourceId: string;
  error: string;
}

export interface HarvestReport {
  query: string;
  signals: RawSignal[];
  evidence: Evidence[];
  failures: HarvestFailure[];
  sourceCount: number;
  successfulSources: number;
  duplicateSignalsRemoved: number;
}

function key(signal: RawSignal): string {
  return [
    signal.kind,
    signal.title.trim().toLowerCase(),
    signal.text.trim().toLowerCase(),
    signal.url ?? ""
  ].join("|");
}

export async function harvest(
  query: string,
  adapters: SourceAdapter[]
): Promise<HarvestReport> {
  const results = await Promise.allSettled(
    adapters.map(async adapter => ({
      adapter,
      signals: await adapter.collect(query)
    }))
  );

  const failures: HarvestFailure[] = [];
  const unique = new Map<string, { signal: RawSignal; source: SourceDefinition }>();

  for (const result of results) {
    if (result.status === "rejected") {
      failures.push({
        sourceId: "unknown",
        error: result.reason instanceof Error ? result.reason.message : String(result.reason)
      });
      continue;
    }

    for (const signal of result.value.signals) {
      const source = result.value.adapter.definition;
      const id = key(signal);
      if (!unique.has(id)) unique.set(id, { signal, source });
    }
  }

  const signals = [...unique.values()].map(item => item.signal);
  const evidence = [...unique.values()].map(item =>
    normalizeSignal(item.signal, item.source.reliability)
  );

  return {
    query,
    signals,
    evidence,
    failures,
    sourceCount: adapters.length,
    successfulSources: adapters.length - failures.length,
    duplicateSignalsRemoved:
      results.reduce((total, result) =>
        result.status === "fulfilled" ? total + result.value.signals.length : total, 0
      ) - signals.length
  };
}
