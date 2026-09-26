import { Opportunity, OpportunityStage } from "../domain/opportunity.js";
import { EvidenceKind, EvidenceState } from "../domain/evidence.js";
import { readJson, writeJson } from "./json-store.js";

export interface ForgeState {
  version: 1;
  opportunities: Opportunity[];
}

const STAGES: ReadonlySet<OpportunityStage> = new Set([
  "captured","researched","challenged","validation","validated","rejected","building","verified"
]);
const EVIDENCE_KINDS: ReadonlySet<EvidenceKind> = new Set([
  "revenue","pricing","customer","marketplace","usage","complaint","competitor","local-gap","first-party","internal","community"
]);
const EVIDENCE_STATES: ReadonlySet<EvidenceState> = new Set(["VERIFIED","CLAIMED","UNKNOWN","STALE"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validState(value: unknown): value is ForgeState {
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.opportunities)) return false;
  const ids = new Set<string>();
  return value.opportunities.every(item => {
    if (!isObject(item) || typeof item.id !== "string" || !item.id || ids.has(item.id)) return false;
    ids.add(item.id);
    if (typeof item.title !== "string" || !item.title.trim() ||
        typeof item.problem !== "string" || !item.problem.trim() ||
        typeof item.customer !== "string" || !item.customer.trim() ||
        !Array.isArray(item.existingSolutions) || !Array.isArray(item.differentiators) ||
        !Array.isArray(item.evidence) || typeof item.stage !== "string" || !STAGES.has(item.stage as OpportunityStage) ||
        typeof item.createdAt !== "string" || !Number.isFinite(Date.parse(item.createdAt)) ||
        typeof item.updatedAt !== "string" || !Number.isFinite(Date.parse(item.updatedAt))) return false;
    if (!isObject(item.validation)) return false;
    for (const key of ["customerConversations","waitlistSignups","trials","paidCustomers","paymentEvidence"]) {
      const n=item.validation[key];
      if (!Number.isInteger(n) || (n as number) < 0) return false;
    }
    const evidenceIds = new Set<string>();
    for (const raw of item.evidence) {
      if (!isObject(raw) || typeof raw.id !== "string" || !raw.id || evidenceIds.has(raw.id) ||
          typeof raw.kind !== "string" || !EVIDENCE_KINDS.has(raw.kind as EvidenceKind) ||
          typeof raw.state !== "string" || !EVIDENCE_STATES.has(raw.state as EvidenceState) ||
          typeof raw.claim !== "string" || !raw.claim.trim() ||
          typeof raw.source !== "string" || !raw.source.trim() ||
          typeof raw.observedAt !== "string" || !Number.isFinite(Date.parse(raw.observedAt)) ||
          typeof raw.confidence !== "number" || !Number.isFinite(raw.confidence) || raw.confidence < 0 || raw.confidence > 1) return false;
      if (raw.state === "VERIFIED" && (typeof raw.verifiedAt !== "string" || !Number.isFinite(Date.parse(raw.verifiedAt)))) return false;
      evidenceIds.add(raw.id);
    }
    return true;
  });
}

export class OpportunityStore {
  constructor(private readonly path = ".forge/state.json") {}
  async load(): Promise<ForgeState> {
    const value = await readJson<unknown>(this.path, { version: 1, opportunities: [] });
    if (!validState(value)) throw new Error("Forge state is invalid or incompatible.");
    return value;
  }
  async save(state: ForgeState): Promise<void> {
    if (!validState(state)) throw new Error("Refusing to persist invalid Forge state.");
    await writeJson(this.path, state);
  }
  async add(opportunity: Opportunity): Promise<void> {
    const state = await this.load();
    if (state.opportunities.some(item => item.id === opportunity.id)) throw new Error(`Opportunity already exists: ${opportunity.id}`);
    state.opportunities.push(opportunity);
    await this.save(state);
  }
}
