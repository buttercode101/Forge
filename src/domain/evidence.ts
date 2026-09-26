export type EvidenceState = "VERIFIED" | "CLAIMED" | "UNKNOWN" | "STALE";

export type EvidenceKind =
  | "revenue" | "pricing" | "customer" | "marketplace" | "usage"
  | "complaint" | "competitor" | "local-gap" | "first-party" | "internal" | "community";

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

const STATE_MULTIPLIER: Record<EvidenceState, number> = {
  VERIFIED: 1, CLAIMED: 0.55, UNKNOWN: 0.15, STALE: 0.25
};

export function evidenceConfidence(evidence: Evidence): number {
  return Math.max(0, Math.min(1, evidence.confidence)) * STATE_MULTIPLIER[evidence.state];
}

export function isEvidenceStale(evidence: Evidence, now = new Date(), windowDays = 180): boolean {
  if (evidence.state === "STALE") return true;
  const observed = Date.parse(evidence.observedAt);
  if (!Number.isFinite(observed)) return true;
  const ageDays = Math.max(0, (now.getTime() - observed) / 86400000);
  return ageDays > windowDays;
}

export function assertEvidenceInput(input: Omit<Evidence, "id">): void {
  if (!input.claim.trim()) throw new Error("Evidence claim cannot be empty.");
  if (!input.source.trim()) throw new Error("Evidence source cannot be empty.");
  if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) {
    throw new Error("Evidence confidence must be a finite number between 0 and 1.");
  }
  if (!Number.isFinite(Date.parse(input.observedAt))) throw new Error("Evidence observedAt must be a valid ISO date.");
  if (input.verifiedAt !== undefined && !Number.isFinite(Date.parse(input.verifiedAt))) {
    throw new Error("Evidence verifiedAt must be a valid ISO date.");
  }
  if (input.state === "VERIFIED" && !input.verifiedAt) throw new Error("VERIFIED evidence requires verifiedAt.");
}
