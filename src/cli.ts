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

const [command, ...args] = process.argv.slice(2);
const store = new OpportunityStore();
const service = new OpportunityService(store);

function usage(): never {
  console.error(`Forge

Commands:
  forge opportunity add <title> --problem <problem> --customer <customer>
  forge opportunity list
  forge opportunity assess <id>
  forge opportunity challenge <id>
  forge opportunity dossier <id>
  forge opportunity validate <id>
  forge opportunity transition <id> <stage>
  forge opportunity evidence <id> --kind <kind> --claim <claim> --source <source> --confidence <0..1> [--state <state>]
  forge opportunity validation <id> --conversations <n> --waitlist <n> --trials <n> --paid <n> --payments <n>
  forge research <query> [--geography <geography>]
`);
  process.exit(1);
}

function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function requiredFlag(args: string[], name: string): string {
  const value = flag(args, name);
  if (!value) throw new Error(`Missing required flag ${name}`);
  return value;
}

function integerFlag(args: string[], name: string): number | undefined {
  const value = flag(args, name);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

async function main(): Promise<void> {
  if (command === "research") {
    const query = args.shift();
    if (!query) usage();
    const geography = flag(args, "--geography");
    console.log(JSON.stringify(await research(query, publicResearchAdapters(), geography), null, 2));
    return;
  }

  if (command !== "opportunity") usage();

  const subcommand = args.shift();

  if (subcommand === "add") {
    const title = args.shift();
    const problem = requiredFlag(args, "--problem");
    const customer = requiredFlag(args, "--customer");
    if (!title) usage();

    const now = new Date().toISOString();
    const opportunity = {
      id: randomUUID(),
      title,
      problem,
      customer,
      existingSolutions: [],
      differentiators: [],
      evidence: [],
      stage: "captured" as const,
      createdAt: now,
      updatedAt: now,
      validation: {
        customerConversations: 0,
        waitlistSignups: 0,
        trials: 0,
        paidCustomers: 0,
        paymentEvidence: 0
      }
    };

    await store.add(opportunity);
    console.log(JSON.stringify(opportunity, null, 2));
    return;
  }

  if (subcommand === "list") {
    console.log(JSON.stringify((await store.load()).opportunities, null, 2));
    return;
  }

  const id = args.shift();
  if (!id) usage();

  if (false) {
    console.log(JSON.stringify((await store.load()).opportunities, null, 2));
    return;
  }

  const opportunity = await service.get(id);

  if (subcommand === "assess") {
    console.log(JSON.stringify(assessOpportunity(opportunity), null, 2));
    return;
  }

  if (subcommand === "challenge") {
    console.log(JSON.stringify(generateChallenges(opportunity), null, 2));
    return;
  }

  if (subcommand === "dossier") {
    console.log(JSON.stringify(buildDossier(opportunity), null, 2));
    return;
  }

  if (subcommand === "validate") {
    console.log(JSON.stringify(validateOpportunity(opportunity), null, 2));
    return;
  }

  if (subcommand === "transition") {
    const stage = args.shift();
    if (!stage) usage();
    console.log(JSON.stringify(await service.transition(id, stage as OpportunityStage), null, 2));
    return;
  }

  if (subcommand === "evidence") {
    const kind = requiredFlag(args, "--kind") as EvidenceKind;
    const claim = requiredFlag(args, "--claim");
    const source = requiredFlag(args, "--source");
    const confidence = Number(requiredFlag(args, "--confidence"));
    if (!Number.isFinite(confidence)) throw new Error("--confidence must be a number");
    const state = (flag(args, "--state") ?? "CLAIMED") as EvidenceState;
    if (!["VERIFIED", "CLAIMED", "UNKNOWN", "STALE"].includes(state)) {
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
    if (Object.values(patch).every(value => value === undefined)) {
      usage();
    }
    console.log(JSON.stringify(await service.updateValidation(id, patch), null, 2));
    return;
  }

  usage();
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
