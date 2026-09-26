import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const cli = join(process.cwd(), "dist", "src", "cli.js");
const standalone = join(process.cwd(), "tools", "standalone-verify.mjs");

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [command, ...args], { cwd });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

const cwd = await mkdtemp(join(tmpdir(), "forge-release-"));
const checks = [];
try {
  const add = await run(cli, ["opportunity", "add", "Release verification", "--problem", "A deterministic verification path", "--customer", "Operators"], cwd);
  checks.push({ name: "cli_add", pass: add.code === 0 });
  const created = add.code === 0 ? JSON.parse(add.stdout) : null;

  const statePath = join(cwd, ".forge", "state.json");
  const standaloneValid = await run(standalone, [statePath], process.cwd());
  checks.push({
    name: "independent_state_verification",
    pass: standaloneValid.code === 0 && /"valid":true/.test(standaloneValid.stdout)
  });

  const list = created ? await run(cli, ["opportunity", "list"], cwd) : { code: -1, stdout: "", stderr: "" };
  const opportunities = list.code === 0 ? JSON.parse(list.stdout) : [];
  checks.push({ name: "cli_persistence", pass: list.code === 0 && created !== null && opportunities.some(item => item.id === created.id) });

  const dossier = created ? await run(cli, ["opportunity", "dossier", created.id], cwd) : { code: -1, stdout: "", stderr: "" };
  const dossierJson = dossier.code === 0 ? JSON.parse(dossier.stdout) : {};
  checks.push({ name: "dossier_generation", pass: dossier.code === 0 && typeof dossierJson.decision === "string" });

  const originalState = await readFile(statePath, "utf8");
  const tampered = JSON.parse(originalState);
  tampered.opportunities[0].validation.paidCustomers = -1;
  await writeFile(statePath, JSON.stringify(tampered));
  const independentReject = await run(standalone, [statePath], process.cwd());
  checks.push({ name: "independent_tamper_rejected", pass: independentReject.code !== 0 });

  const canonicalReject = await run(cli, ["opportunity", "list"], cwd);
  checks.push({ name: "canonical_tamper_rejected", pass: canonicalReject.code !== 0 && /invalid/i.test(canonicalReject.stderr) });

  const report = {
    proofSchema: "forge-verification-v1",
    verifier: "forge-standalone-state-v1",
    forgeVersion: JSON.parse(await readFile("package.json", "utf8")).version,
    node: process.version,
    commit: process.env.GITHUB_SHA ?? "local",
    checks,
    trustBoundary: {
      independentVerifier: "tools/standalone-verify.mjs validates the persisted state without importing Forge source modules.",
      canonicalVerifier: "the CLI/store independently validates the same tampered state.",
      limitation: "The standalone verifier validates the persisted state contract; it does not independently reimplement Forge's opportunity decision algorithms."
    },
    pass: checks.every(check => check.pass),
    generatedAt: new Date().toISOString()
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
} finally {
  await rm(cwd, { recursive: true, force: true });
}
