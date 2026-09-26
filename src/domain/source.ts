import { RawSignal } from "./ingestion.js";

export type SourceType =
  | "first-party"
  | "marketplace"
  | "revenue-marketplace"
  | "app-store"
  | "customer-review"
  | "community"
  | "directory"
  | "internal";

export interface SourceDefinition {
  id: string;
  type: SourceType;
  name: string;
  reliability: number;
  supports: Array<"revenue" | "pricing" | "customers" | "pain" | "competition" | "local-gap">;
}

export interface SourceAdapter {
  definition: SourceDefinition;
  collect(query: string): Promise<RawSignal[]>;
}

export const defaultSources: SourceDefinition[] = [
  { id: "first-party", type: "first-party", name: "First-party records", reliability: 1, supports: ["revenue", "pricing", "customers"] },
  { id: "revenue-marketplace", type: "revenue-marketplace", name: "Revenue/acquisition marketplace", reliability: 0.85, supports: ["revenue", "pricing", "customers", "competition"] },
  { id: "app-store", type: "app-store", name: "App/integration marketplace", reliability: 0.75, supports: ["pricing", "customers", "competition"] },
  { id: "customer-review", type: "customer-review", name: "Customer reviews", reliability: 0.7, supports: ["pain", "competition"] },
  { id: "community", type: "community", name: "Community discussions", reliability: 0.4, supports: ["pain", "competition", "local-gap"] },
  { id: "internal", type: "internal", name: "Existing project/work context", reliability: 0.9, supports: ["pain", "customers", "competition", "local-gap"] }
];
