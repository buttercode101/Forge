import { readFile } from "node:fs/promises";

const input = process.argv[2];
if (!input) {
  console.error("usage: node tools/standalone-verify.mjs <state.json>");
  process.exit(2);
}
const fail = message => { console.error(message); process.exit(1); };
let value;
try { value = JSON.parse(await readFile(input, "utf8")); }
catch (error) { fail(`cannot read JSON state: ${error instanceof Error ? error.message : String(error)}`); }

const object = value && typeof value === "object" ? value : null;
if (!object || object.version !== 1 || !Array.isArray(object.opportunities)) fail("invalid Forge state envelope");

const stages = new Set(["captured","researched","challenged","validation","validated","rejected","building","verified"]);
const evidenceKinds = new Set(["revenue","pricing","customer","marketplace","usage","complaint","competitor","local-gap","first-party","internal","community"]);
const evidenceStates = new Set(["VERIFIED","CLAIMED","UNKNOWN","STALE"]);
const ids = new Set();
const isNonEmptyString = value => typeof value === "string" && value.trim().length > 0;
const isTimestamp = value => typeof value === "string" && Number.isFinite(Date.parse(value));
const isNonNegativeInteger = value => Number.isInteger(value) && value >= 0;

for (const opportunity of object.opportunities) {
  if (!opportunity || typeof opportunity !== "object") fail("invalid opportunity");
  if (!isNonEmptyString(opportunity.id) || ids.has(opportunity.id)) fail("invalid or duplicate opportunity id");
  ids.add(opportunity.id);
  if (!isNonEmptyString(opportunity.title) || !isNonEmptyString(opportunity.problem) || !isNonEmptyString(opportunity.customer)) fail("invalid opportunity identity fields");
  if (opportunity.category !== undefined && typeof opportunity.category !== "string") fail("invalid opportunity category");
  if (opportunity.geography !== undefined && typeof opportunity.geography !== "string") fail("invalid opportunity geography");
  if (!Array.isArray(opportunity.existingSolutions) || !opportunity.existingSolutions.every(v => typeof v === "string")) fail("invalid existingSolutions");
  if (!Array.isArray(opportunity.differentiators) || !opportunity.differentiators.every(v => typeof v === "string")) fail("invalid differentiators");
  if (!Array.isArray(opportunity.evidence)) fail("invalid evidence collection");
  if (!stages.has(opportunity.stage) || !isTimestamp(opportunity.createdAt) || !isTimestamp(opportunity.updatedAt)) fail("invalid opportunity lifecycle fields");
  const validation = opportunity.validation;
  if (!validation || typeof validation !== "object") fail("invalid validation counters");
  for (const key of ["customerConversations","waitlistSignups","trials","paidCustomers","paymentEvidence"]) {
    if (!isNonNegativeInteger(validation[key])) fail(`invalid validation counter: ${key}`);
  }
  const evidenceIds = new Set();
  for (const evidence of opportunity.evidence) {
    if (!evidence || typeof evidence !== "object") fail("invalid evidence");
    if (!isNonEmptyString(evidence.id) || evidenceIds.has(evidence.id)) fail("invalid or duplicate evidence id");
    evidenceIds.add(evidence.id);
    if (!evidenceKinds.has(evidence.kind) || !evidenceStates.has(evidence.state) ||
        !isNonEmptyString(evidence.claim) || !isNonEmptyString(evidence.source) ||
        !isTimestamp(evidence.observedAt) ||
        typeof evidence.confidence !== "number" || !Number.isFinite(evidence.confidence) ||
        evidence.confidence < 0 || evidence.confidence > 1) fail("invalid evidence fields");
    if (evidence.verifiedAt !== undefined && !isTimestamp(evidence.verifiedAt)) fail("invalid verifiedAt");
    if (evidence.state === "VERIFIED" && !isTimestamp(evidence.verifiedAt)) fail("verified evidence requires verifiedAt");
    if (evidence.notes !== undefined && typeof evidence.notes !== "string") fail("invalid evidence notes");
  }
}
console.log(JSON.stringify({ verifier: "forge-standalone-state-v1", valid: true, opportunities: object.opportunities.length }));
