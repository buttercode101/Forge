import { randomUUID } from "node:crypto";
import { Evidence, EvidenceKind, EvidenceState } from "../domain/evidence.js";
import { Opportunity, OpportunityStage } from "../domain/opportunity.js";
import { validateOpportunity } from "../domain/validation.js";
import { transition } from "../domain/pipeline.js";
import { OpportunityStore } from "../store/opportunity-store.js";

export interface EvidenceInput {
  kind: EvidenceKind;
  claim: string;
  source: string;
  confidence: number;
  state?: EvidenceState;
  observedAt?: string;
  verifiedAt?: string;
  notes?: string;
}

export class OpportunityService {
  constructor(private readonly store = new OpportunityStore()) {}

  async get(id: string): Promise<Opportunity> {
    const state = await this.store.load();
    const opportunity = state.opportunities.find(item => item.id === id);
    if (!opportunity) throw new Error(`Opportunity not found: ${id}`);
    return opportunity;
  }

  async addEvidence(id: string, input: EvidenceInput): Promise<Opportunity> {
    const state = await this.store.load();
    const index = state.opportunities.findIndex(item => item.id === id);
    if (index < 0) throw new Error(`Opportunity not found: ${id}`);

    const evidence: Evidence = {
      id: randomUUID(),
      kind: input.kind,
      state: input.state ?? "CLAIMED",
      claim: input.claim,
      source: input.source,
      observedAt: input.observedAt ?? new Date().toISOString(),
      verifiedAt: input.verifiedAt,
      confidence: Math.max(0, Math.min(1, input.confidence)),
      notes: input.notes
    };

    const opportunity = {
      ...state.opportunities[index],
      evidence: [...state.opportunities[index].evidence, evidence],
      updatedAt: new Date().toISOString()
    };
    state.opportunities[index] = opportunity;
    await this.store.save(state);
    return opportunity;
  }

  async updateValidation(
    id: string,
    patch: Partial<Opportunity["validation"]>
  ): Promise<Opportunity> {
    const state = await this.store.load();
    const index = state.opportunities.findIndex(item => item.id === id);
    if (index < 0) throw new Error(`Opportunity not found: ${id}`);

    const current = state.opportunities[index];
    const validation = { ...current.validation };
    for (const key of Object.keys(patch) as Array<keyof Opportunity["validation"]>) {
      const value = patch[key];
      if (value !== undefined) {
        if (!Number.isInteger(value) || value < 0) {
          throw new Error(`Validation value for ${key} must be a non-negative integer.`);
        }
        validation[key] = value;
      }
    }

    const opportunity = { ...current, validation, updatedAt: new Date().toISOString() };
    state.opportunities[index] = opportunity;
    await this.store.save(state);
    return opportunity;
  }

  async transition(id: string, stage: OpportunityStage): Promise<Opportunity> {
    const state = await this.store.load();
    const index = state.opportunities.findIndex(item => item.id === id);
    if (index < 0) throw new Error(`Opportunity not found: ${id}`);

    const current = state.opportunities[index];
    if (stage === "validated") {
      const gate = validateOpportunity(current);
      if (!gate.pass) {
        throw new Error(`Validation gate failed: ${gate.requiredActions.join(" ")}`);
      }
    }

    const opportunity = transition(current, stage);
    state.opportunities[index] = opportunity;
    await this.store.save(state);
    return opportunity;
  }
}
