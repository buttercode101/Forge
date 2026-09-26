import { Opportunity } from "../domain/opportunity.js";
import { readJson, writeJson } from "./json-store.js";

export interface ForgeState {
  version: 1;
  opportunities: Opportunity[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validState(value: unknown): value is ForgeState {
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.opportunities)) return false;
  return value.opportunities.every(item => {
    if (!isObject(item)) return false;
    return typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.problem === "string" &&
      typeof item.customer === "string" &&
      Array.isArray(item.evidence) &&
      Array.isArray(item.existingSolutions) &&
      Array.isArray(item.differentiators) &&
      typeof item.validation === "object" &&
      item.validation !== null;
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
    if (state.opportunities.some(item => item.id === opportunity.id)) {
      throw new Error(`Opportunity already exists: ${opportunity.id}`);
    }
    state.opportunities.push(opportunity);
    await this.save(state);
  }
}
