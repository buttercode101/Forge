import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const cli = join(process.cwd(), "dist", "src", "cli.js");

function run(cwd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { cwd });
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
  const add = await run(cwd, ["opportunity", "add", "Release verification", "--problem", "A deterministic verification path", "--customer", "Operators"]);
  checks.push({ name: "cli_add", pass: add.code === 0 });
  const created = JSON.parse(add.stdout);
  const list = await run(cwd, ["opportunity", "list"]);
  const opportunities = list.code === 0 ? JSON.parse(list.stdout) : [];
  checks.push({ name: "cli_persistence", pass: list.code === 0 && opportunities.some(item => item.id === created.id) });
  const dossier = await run(cwd, ["opportunity", "dossier", created.id]);
  const dossierJson = dossier.code === 0 ? JSON.parse(dossier.stdout) : {};
  checks.push({ name: "dossier_generation", pass: dossier.code === 0 && typeof dossierJson.decision === "string" });

  await writeFile(join(cwd, ".forge", "state.json"), JSON.stringify({ version: 999, opportunities: [] }));
  const invalid = await run(cwd, ["opportunity", "list"]);
  checks.push({ name: "invalid_state_rejected", pass: invalid.code !== 0 && /invalid/i.test(invalid.stderr) });

  const report = {
    forgeVersion: JSON.parse(await readFile("package.json", "utf8")).version,
    node: process.version,
    commit: process.env.GITHUB_SHA ?? "local",
    checks,
    pass: checks.every(check => check.pass),
    generatedAt: new Date().toISOString()
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
} finally {
  await rm(cwd, { recursive: true, force: true });
}
