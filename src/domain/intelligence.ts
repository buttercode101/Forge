import { Evidence, evidenceConfidence } from "./evidence.js";
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
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter(x => right.has(x)).length;
  return intersection / Math.max(left.size, right.size);
}

function sourceRoot(source: string): string {
  return source.split(":")[0].trim().toLowerCase();
}

export function analyzeEvidence(evidence: Evidence[], now = new Date()): IntelligenceReport {
  const sources = new Set(evidence.map(e => sourceRoot(e.source)));
  const verified = evidence.filter(e => e.state === "VERIFIED");
  const stale = evidence.filter(e => e.state === "STALE");
  const unknown = evidence.filter(e => e.state === "UNKNOWN");

  const corroborated: string[] = [];
  const contradictions: EvidenceContradiction[] = [];

  for (let i = 0; i < evidence.length; i++) {
    for (let j = i + 1; j < evidence.length; j++) {
      const a = evidence[i];
      const b = evidence[j];
      if (sourceRoot(a.source) === sourceRoot(b.source)) continue;
      if (a.kind !== b.kind) continue;

      const sim = similarity(a.claim, b.claim);
      if (sim >= 0.55) corroborated.push(a.claim);

      const aNegative = /not|no|never|doesn't|cannot|can't|zero|none/i.test(a.claim);
      const bNegative = /not|no|never|doesn't|cannot|can't|zero|none/i.test(b.claim);
      if (sim >= 0.45 && aNegative !== bNegative) {
        contradictions.push({
          left: a.claim,
          right: b.claim,
          sources: [a.source, b.source],
          reason: "Independent sources express materially conflicting claims."
        });
      }
    }
  }

  const ages = evidence.map(e => {
    const ageDays = Math.max(0, (now.getTime() - new Date(e.observedAt).getTime()) / 86400000);
    return Math.exp(-ageDays / 180);
  });

  return {
    independentSources: sources.size,
    verifiedEvidence: verified.length,
    corroboratedClaims: [...new Set(corroborated)],
    contradictions,
    staleEvidence: stale.map(e => e.claim),
    blockingUnknowns: unknown.map(e => e.claim),
    evidenceFreshness: ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 0,
    corroboration: evidence.length ? Math.min(1, corroborated.length / Math.max(1, evidence.length)) : 0
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
    ...report.contradictions.map(x => `Resolve contradiction: ${x.left} / ${x.right}`),
    ...(report.independentSources < 2 ? ["Need corroboration from an independent source."] : [])
  ];
  return {
    opportunityId: o.id,
    report,
    researchReady: blockers.length === 0 && report.verifiedEvidence > 0,
    blockers
  };
}
