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
  independentSources: number;
  repeatedPain: string;
}

const tokenize = (value: string): Set<string> =>
  new Set(value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(word => word.length > 2));

export function normalizeSignal(signal: RawSignal, confidence = 0.5): Evidence {
  if (!signal.id.trim() || !signal.source.trim() || !signal.text.trim()) {
    throw new Error("Raw signal must contain id, source, and text.");
  }
  if (!Number.isFinite(Date.parse(signal.observedAt))) {
    throw new Error("Raw signal observedAt must be a valid date.");
  }
  return {
    id: signal.id,
    kind: signal.kind,
    state: "CLAIMED",
    claim: signal.text.trim(),
    source: signal.url ? `${signal.source.trim()}: ${signal.url}` : signal.source.trim(),
    observedAt: signal.observedAt,
    confidence: Math.max(0, Math.min(1, Number.isFinite(confidence) ? confidence : 0)),
    notes: signal.title.trim() || undefined
  };
}

function similarity(a: RawSignal, b: RawSignal): number {
  const left = tokenize(a.text);
  const right = tokenize(b.text);
  if (!left.size || !right.size) return 0;
  return [...left].filter(x => right.has(x)).length / Math.max(left.size, right.size);
}

export function clusterSignals(signals: RawSignal[]): SignalCluster[] {
  const clusters: SignalCluster[] = [];
  for (const signal of signals) {
    const existing = clusters.find(cluster =>
      cluster.signals.some(candidate =>
        candidate.kind === signal.kind && similarity(candidate, signal) >= 0.65
      )
    );
    if (existing) existing.signals.push(signal);
    else clusters.push({
      key: `${signal.kind}:${signal.id}`,
      signals: [signal],
      independentSources: 1,
      repeatedPain: "Single observed signal; corroboration required"
    });
  }

  for (const cluster of clusters) {
    cluster.independentSources = new Set(cluster.signals.map(s => s.source.toLowerCase())).size;
    cluster.repeatedPain = cluster.signals.length > 1
      ? `${cluster.signals.length} signals share a recurring pattern across ${cluster.independentSources} source(s)`
      : "Single observed signal; corroboration required";
  }
  return clusters;
}
