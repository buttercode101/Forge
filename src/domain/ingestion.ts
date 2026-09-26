import { Evidence, EvidenceKind } from "./evidence.js";

export interface RawSignal {
  id: string;
  source: string;
  kind: EvidenceKind;
  title: string;
  text: string;
  observedAt: string;
  url?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface SignalCluster {
  key: string;
  signals: RawSignal[];
  repeatedPain: string;
}

export function normalizeSignal(signal: RawSignal): Evidence {
  return {
    id: signal.id,
    kind: signal.kind,
    state: "CLAIMED",
    claim: signal.text,
    source: signal.url ? `${signal.source}: ${signal.url}` : signal.source,
    observedAt: signal.observedAt,
    confidence: 0.5,
    notes: signal.title
  };
}

export function clusterSignals(signals: RawSignal[]): SignalCluster[] {
  const groups = new Map<string, RawSignal[]>();

  for (const signal of signals) {
    const words = signal.text
      .toLowerCase()
      .replace(/[^a-z0-9\\s]/g, " ")
      .split(/\\s+/)
      .filter(Boolean)
      .slice(0, 5)
      .sort()
      .join("-");
    const key = words || signal.kind;
    groups.set(key, [...(groups.get(key) ?? []), signal]);
  }

  return [...groups.entries()].map(([key, grouped]) => ({
    key,
    signals: grouped,
    repeatedPain: grouped.length > 1
      ? `${grouped.length} signals share a recurring pattern`
      : "Single observed signal; corroboration required"
  }));
}
