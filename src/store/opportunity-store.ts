import { Opportunity } from "../domain/opportunity.js";
import { readJson, writeJson } from "./json-store.js";

export interface ForgeState {
  version: 1;
  opportunities: Opportunity[];
}

export class OpportunityStore {
  constructor(private readonly path = ".forge/state.json") {}

  async load(): Promise<ForgeState> {
    return readJson<ForgeState>(this.path, { version: 1, opportunities: [] });
  }

  async save(state: ForgeState): Promise<void> {
    await writeJson(this.path, state);
  }

  async add(opportunity: Opportunity): Promise<void> {
    const state = await this.load();
    state.opportunities.push(opportunity);
    await this.save(state);
  }
}
