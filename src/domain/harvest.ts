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
  const results = await Promise.all(
    adapters.map(async adapter => {
      try {
        return {
          ok: true as const,
          adapter,
          signals: await adapter.collect(query)
        };
      } catch (error: unknown) {
        return {
          ok: false as const,
          sourceId: adapter.definition.id,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    })
  );

  const failures: HarvestFailure[] = [];
  const unique = new Map<string, { signal: RawSignal; source: SourceDefinition }>();

  for (const result of results) {
    if (!result.ok) {
      failures.push({ sourceId: result.sourceId, error: result.error });
      continue;
    }

    for (const signal of result.signals) {
      const source = result.adapter.definition;
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
        result.ok ? total + result.signals.length : total, 0
      ) - signals.length
  };
}
