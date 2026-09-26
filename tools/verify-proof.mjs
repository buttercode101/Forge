import { readFile } from "node:fs/promises";

const input = process.argv[2];
if (!input) {
  console.error("usage: node tools/verify-proof.mjs <forge-verification.json>");
  process.exit(2);
}

const fail = message => { console.error(message); process.exit(1); };
let proof;
try { proof = JSON.parse(await readFile(input, "utf8")); }
catch (error) { fail(`cannot read proof: ${error instanceof Error ? error.message : String(error)}`); }

if (!proof || typeof proof !== "object") fail("proof is not an object");
if (proof.proofSchema !== "forge-verification-v1") fail("unsupported proof schema");
if (typeof proof.forgeVersion !== "string" || typeof proof.node !== "string" || typeof proof.commit !== "string") fail("missing proof identity");
if (!Array.isArray(proof.checks) || proof.checks.length === 0) fail("proof has no checks");
if (!proof.checks.every(check => check && typeof check.name === "string" && typeof check.pass === "boolean" && check.pass)) fail("proof contains failed or malformed checks");
if (!proof.trustBoundary || typeof proof.trustBoundary !== "object" ||
    typeof proof.trustBoundary.independentVerifier !== "string" ||
    typeof proof.trustBoundary.canonicalVerifier !== "string" ||
    typeof proof.trustBoundary.limitation !== "string") fail("proof trust boundary is incomplete");
if (proof.pass !== true) fail("proof does not declare overall pass");

console.log(JSON.stringify({ verifier:"forge-proof-v1", valid:true, checks:proof.checks.length }));
