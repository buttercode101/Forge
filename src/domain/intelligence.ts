import { Evidence, isEvidenceStale } from "./evidence.js";
import { Opportunity } from "./opportunity.js";

export interface EvidenceContradiction {
  left: string;
  right: string;
  sources: [string, string];
  reason: string;
}

export interface IntelligenceReport {
  independentSources: number;
  verifiedEvidence: number;
  corroboratedClaims: string[];
  contradictions: EvidenceContradiction[];
  staleEvidence: string[];
  blockingUnknowns: string[];
  evidenceFreshness: number;
  corroboration: number;
}

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(value: string): Set<string> {
  return new Set(normalized(value).split(" ").filter(word => word.length > 2));
}

function similarity(a: string, b: string): number {
  const left = tokens(a), right = tokens(b);
  if (!left.size || !right.size) return 0;
  return [...left].filter(x => right.has(x)).length / Math.max(left.size, right.size);
}

function sourceRoot(source: string): string {
  const value = source.trim().toLowerCase();
  const separator = value.indexOf(":");
  return separator >= 0 ? value.slice(0, separator).trim() : value;
}

function isNegative(claim: string): boolean {
  return /\b(not|no|never|doesn'?t|cannot|can'?t|zero|none|without)\b/i.test(claim);
}

function freshness(observedAt: string, now: Date, windowDays: number): number {
  const time = Date.parse(observedAt);
  if (!Number.isFinite(time)) return 0;
  const ageDays = Math.max(0, (now.getTime() - time) / 86400000);
  return Math.exp(-ageDays / windowDays);
}

export function analyzeEvidence(evidence: Evidence[], now = new Date(), freshnessWindowDays = 180): IntelligenceReport {
  const sources = new Set(evidence.map(e => sourceRoot(e.source)).filter(Boolean));
  const verified = evidence.filter(e => e.state === "VERIFIED");
  const stale = evidence.filter(e => isEvidenceStale(e, now, freshnessWindowDays));
  const unknown = evidence.filter(e => e.state === "UNKNOWN");
  const corroborated = new Set<string>();
  const corroboratedEvidence = new Set<string>();
  const contradictions: EvidenceContradiction[] = [];

  for (let i = 0; i < evidence.length; i++) {
    for (let j = i + 1; j < evidence.length; j++) {
      const a = evidence[i], b = evidence[j];
      if (sourceRoot(a.source) === sourceRoot(b.source) || a.kind !== b.kind) continue;
      const sim = similarity(a.claim, b.claim);
      if (sim >= 0.65) {
        corroborated.add(a.claim);
        corroboratedEvidence.add(a.id);
        corroboratedEvidence.add(b.id);
      }
      if (sim >= 0.45 && isNegative(a.claim) !== isNegative(b.claim)) {
        contradictions.push({
          left: a.claim, right: b.claim, sources: [a.source, b.source],
          reason: "Independent sources express materially conflicting claims."
        });
      }
    }
  }

  const freshnessValues = evidence.map(e => freshness(e.observedAt, now, freshnessWindowDays));
  return {
    independentSources: sources.size,
    verifiedEvidence: verified.length,
    corroboratedClaims: [...corroborated],
    contradictions,
    staleEvidence: [...new Set(stale.map(e => e.claim))],
    blockingUnknowns: unknown.map(e => e.claim),
    evidenceFreshness: freshnessValues.length ? freshnessValues.reduce((a,b)=>a+b,0)/freshnessValues.length : 0,
    corroboration: evidence.length ? corroboratedEvidence.size / evidence.length : 0
  };
}

export interface OpportunityIntelligence {
  opportunityId: string;
  report: IntelligenceReport;
  researchReady: boolean;
  blockers: string[];
}

export function analyzeOpportunity(o: Opportunity, now = new Date()): OpportunityIntelligence {
  const report = analyzeEvidence(o.evidence, now);
  const blockers = [
    ...report.blockingUnknowns.map(x => `Resolve unknown: ${x}`),
    ...report.staleEvidence.map(x => `Refresh stale evidence: ${x}`),
    ...report.contradictions.map(x => `Resolve contradiction: ${x.left} / ${x.right}`),
    ...(report.independentSources < 2 ? ["Need corroboration from an independent source."] : [])
  ];
  return {
    opportunityId: o.id,
    report,
    researchReady: blockers.length === 0 && o.evidence.length > 0,
    blockers: [...new Set(blockers)]
  };
}
