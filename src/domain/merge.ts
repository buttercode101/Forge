import { Opportunity } from "./opportunity.js";

export interface OpportunitySimilarity {
  leftId: string;
  rightId: string;
  similarity: number;
  reasons: string[];
}

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(x => x.length > 2));
}

function overlap(a: string, b: string): number {
  const x = tokens(a);
  const y = tokens(b);
  if (!x.size || !y.size) return 0;
  return [...x].filter(t => y.has(t)).length / Math.max(x.size, y.size);
}

export function compareOpportunities(a: Opportunity, b: Opportunity): OpportunitySimilarity {
  const problem = overlap(a.problem, b.problem);
  const customer = overlap(a.customer, b.customer);
  const category = a.category && b.category ? overlap(a.category, b.category) : 0;
  const geography = a.geography && b.geography ? overlap(a.geography, b.geography) : 0;
  const similarity = problem * 0.5 + customer * 0.3 + category * 0.1 + geography * 0.1;
  const reasons: string[] = [];
  if (problem >= 0.5) reasons.push("same or closely related problem");
  if (customer >= 0.5) reasons.push("same customer segment");
  if (category >= 0.5) reasons.push("same category");
  if (geography >= 0.5) reasons.push("same geography");
  return { leftId: a.id, rightId: b.id, similarity, reasons };
}

export function findDuplicateCandidates(opportunities: Opportunity[], threshold = 0.65): OpportunitySimilarity[] {
  const candidates: OpportunitySimilarity[] = [];
  for (let i = 0; i < opportunities.length; i++) {
    for (let j = i + 1; j < opportunities.length; j++) {
      const match = compareOpportunities(opportunities[i], opportunities[j]);
      if (match.similarity >= threshold) candidates.push(match);
    }
  }
  return candidates.sort((a, b) => b.similarity - a.similarity);
}
