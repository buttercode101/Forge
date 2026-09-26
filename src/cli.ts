#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { OpportunityStore } from "./store/opportunity-store.js";
import { assessOpportunity } from "./domain/opportunity.js";

const [command, ...args] = process.argv.slice(2);
const store = new OpportunityStore();

function usage(): never {
  console.error(`Forge

Commands:
  forge opportunity add <title> --problem <problem> --customer <customer>
  forge opportunity list
  forge opportunity assess <id>
`);
  process.exit(1);
}

async function main(): Promise<void> {
  if (command !== "opportunity") usage();

  const subcommand = args.shift();
  if (subcommand === "add") {
    const title = args.shift();
    const problemIndex = args.indexOf("--problem");
    const customerIndex = args.indexOf("--customer");

    if (!title || problemIndex < 0 || customerIndex < 0) usage();

    const problem = args[problemIndex + 1];
    const customer = args[customerIndex + 1];
    if (!problem || !customer) usage();

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

  const state = await store.load();

  if (subcommand === "list") {
    console.log(JSON.stringify(state.opportunities, null, 2));
    return;
  }

  if (subcommand === "assess") {
    const id = args[0];
    const opportunity = state.opportunities.find(item => item.id === id);
    if (!opportunity) throw new Error(`Opportunity not found: ${id}`);
    console.log(JSON.stringify(assessOpportunity(opportunity), null, 2));
    return;
  }

  usage();
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
