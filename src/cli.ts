#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { OpportunityStore } from "./store/opportunity-store.js";
import { OpportunityService } from "./application/opportunity-service.js";
import { assessOpportunity } from "./domain/opportunity.js";
import { generateChallenges } from "./domain/challenge.js";
import { validateOpportunity } from "./domain/validation.js";
import { EvidenceKind, EvidenceState } from "./domain/evidence.js";
import { OpportunityStage } from "./domain/opportunity.js";
import { buildDossier } from "./domain/dossier.js";
import { publicResearchAdapters, research } from "./research.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { scanProject } from "./project/scan.js";
import { verifyClaim, type ClaimKind, type Evidence } from "./project/verification.js";
import { initialProjectState, readProjectState, writeProjectState } from "./project/state.js";

const [command, ...args] = process.argv.slice(2);
const store = new OpportunityStore();
const service = new OpportunityService(store);

function usage(): never {
  console.error(`Forge

Commands:
  forge scan [project-path] [--state .forge/state.json]
  forge change <summary> [--state .forge/state.json] [--commit sha]
  forge verify <tests-pass|build-works|deployment-works|requirement-satisfied|project-complete> --evidence <evidence.json>
  forge research <query> [--geography <geography>]
  forge opportunity add <title> --problem <problem> --customer <customer>
  forge opportunity list
  forge opportunity assess <id>
  forge opportunity challenge <id>
  forge opportunity dossier <id>
  forge opportunity validate <id>
  forge opportunity transition <id> <stage>
  forge opportunity evidence <id> --kind <kind> --claim <claim> --source <source> --confidence <0..1> [--state <state>]
  forge opportunity validation <id> --conversations <n> --waitlist <n> --trials <n> --paid <n> --payments <n>
`);
  process.exit(1);
}

function flag(values: string[], name: string): string | undefined {
  const index = values.indexOf(name);
  return index >= 0 ? values[index + 1] : undefined;
}
function requiredFlag(values: string[], name: string): string {
  const value = flag(values, name)?.trim();
  if (!value) throw new Error(`Missing required flag ${name}`);
  return value;
}
function integerFlag(values: string[], name: string): number | undefined {
  const value = flag(values, name);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative safe integer`);
  return parsed;
}

async function main(): Promise<void> {
  if (command === "scan") {
    const positional = args[0] && !args[0].startsWith("--") ? args.shift() : undefined;
    const root = resolve(positional || process.cwd());
    const stateFlag = flag(args, "--state");
    const scan = await scanProject(root);
    if (stateFlag) {
      const statePath = resolve(stateFlag);
      const state = (await readProjectState(statePath)) ?? initialProjectState(root);
      state.scan = scan;
      state.updatedAt = new Date().toISOString();
      await writeProjectState(statePath, state);
    }
    console.log(JSON.stringify(scan, null, 2));
    return;
  }
  if (command === "change") {
    const summary = args.shift();
    if (!summary) throw new Error("Provide a change summary.");
    const statePath = resolve(flag(args, "--state") || ".forge/state.json");
    const commit = flag(args, "--commit");
    const state = (await readProjectState(statePath)) ?? initialProjectState(process.cwd());
    state.changes.push({ id: `change-${state.changes.length + 1}`, summary, createdAt: new Date().toISOString(), ...(commit ? { commit } : {}) });
    state.updatedAt = new Date().toISOString();
    await writeProjectState(statePath, state);
    console.log(JSON.stringify(state.changes.at(-1), null, 2));
    return;
  }
  if (command === "verify") {
    const kind = args.shift() as ClaimKind | undefined;
    const allowed: ClaimKind[] = ["tests-pass","build-works","deployment-works","requirement-satisfied","project-complete"];
    if (!kind || !allowed.includes(kind)) throw new Error("Choose a supported structured claim kind.");
    const evidencePath = requiredFlag(args, "--evidence");
    const parsed = JSON.parse(await readFile(resolve(evidencePath), "utf8")) as unknown;
    if (!Array.isArray(parsed)) throw new Error("Evidence file must contain a JSON array.");
    const result = verifyClaim(kind, parsed as Evidence[]);
    const stateFlag = flag(args, "--state");
    if (stateFlag) {
      const statePath = resolve(stateFlag);
      const state = (await readProjectState(statePath)) ?? initialProjectState(process.cwd());
      state.verifications.push(result);
      state.updatedAt = new Date().toISOString();
      await writeProjectState(statePath, state);
    }
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === "research") {
    const query = args.shift()?.trim();
    if (!query || query.length > 500) throw new Error("Research query must be between 1 and 500 characters.");
    const geography = flag(args, "--geography")?.trim();
    console.log(JSON.stringify(await research(query, publicResearchAdapters(), geography), null, 2));
    return;
  }
  if (command !== "opportunity") usage();
  const subcommand = args.shift();

  if (subcommand === "add") {
    const title = args.shift()?.trim();
    const problem = requiredFlag(args, "--problem");
    const customer = requiredFlag(args, "--customer");
    if (!title) throw new Error("Opportunity title cannot be empty.");
    const now = new Date().toISOString();
    const opportunity = {
      id: randomUUID(), title, problem, customer, existingSolutions: [], differentiators: [], evidence: [],
      stage: "captured" as const, createdAt: now, updatedAt: now,
      validation: { customerConversations: 0, waitlistSignups: 0, trials: 0, paidCustomers: 0, paymentEvidence: 0 }
    };
    await store.add(opportunity);
    console.log(JSON.stringify(opportunity, null, 2));
    return;
  }

  if (subcommand === "list") {
    console.log(JSON.stringify((await store.load()).opportunities, null, 2));
    return;
  }

  const id = args.shift()?.trim();
  if (!id) usage();
  const opportunity = await service.get(id);

  if (subcommand === "assess") { console.log(JSON.stringify(assessOpportunity(opportunity), null, 2)); return; }
  if (subcommand === "challenge") { console.log(JSON.stringify(generateChallenges(opportunity), null, 2)); return; }
  if (subcommand === "dossier") { console.log(JSON.stringify(buildDossier(opportunity), null, 2)); return; }
  if (subcommand === "validate") { console.log(JSON.stringify(validateOpportunity(opportunity), null, 2)); return; }

  if (subcommand === "transition") {
    const stage = args.shift()?.trim() as OpportunityStage | undefined;
    if (!stage) usage();
    console.log(JSON.stringify(await service.transition(id, stage), null, 2));
    return;
  }

  if (subcommand === "evidence") {
    const kind = requiredFlag(args, "--kind") as EvidenceKind;
    const claim = requiredFlag(args, "--claim");
    const source = requiredFlag(args, "--source");
    const confidence = Number(requiredFlag(args, "--confidence"));
    const state = (flag(args, "--state") ?? "CLAIMED") as EvidenceState;
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new Error("--confidence must be a finite number between 0 and 1");
    }
    if (!["revenue","pricing","customer","marketplace","usage","complaint","competitor","local-gap","first-party","internal","community"].includes(kind)) {
      throw new Error("--kind must be a supported evidence kind");
    }
    if (!["VERIFIED","CLAIMED","UNKNOWN","STALE"].includes(state)) {
      throw new Error("--state must be VERIFIED, CLAIMED, UNKNOWN, or STALE");
    }
    console.log(JSON.stringify(await service.addEvidence(id, {
      kind, claim, source, confidence, state,
      verifiedAt: state === "VERIFIED" ? new Date().toISOString() : undefined
    }), null, 2));
    return;
  }

  if (subcommand === "validation") {
    const patch = {
      customerConversations: integerFlag(args, "--conversations"),
      waitlistSignups: integerFlag(args, "--waitlist"),
      trials: integerFlag(args, "--trials"),
      paidCustomers: integerFlag(args, "--paid"),
      paymentEvidence: integerFlag(args, "--payments")
    };
    if (Object.values(patch).every(value => value === undefined)) usage();
    console.log(JSON.stringify(await service.updateValidation(id, patch), null, 2));
    return;
  }
  usage();
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
 );
