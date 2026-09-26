export type EvidenceState = "VERIFIED" | "CLAIMED" | "UNKNOWN" | "STALE";

export type EvidenceKind =
  | "revenue"
  | "pricing"
  | "customer"
  | "marketplace"
  | "usage"
  | "complaint"
  | "competitor"
  | "local-gap"
  | "first-party"
  | "internal";

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  state: EvidenceState;
  claim: string;
  source: string;
  observedAt: string;
  verifiedAt?: string;
  confidence: number;
  notes?: string;
}

export function evidenceConfidence(evidence: Evidence): number {
  const stateMultiplier: Record<EvidenceState, number> = {
    VERIFIED: 1,
    CLAIMED: 0.55,
    UNKNOWN: 0.15,
    STALE: 0.25
  };
  return Math.max(0, Math.min(1, evidence.confidence)) * stateMultiplier[evidence.state];
}
