import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

function runCli(cwd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(process.cwd(), "dist/src/cli.js"), ...args], { cwd });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

test("CLI smoke path creates and reads a persisted opportunity", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "forge-cli-"));
  try {
    const added = await runCli(cwd, ["opportunity", "add", "Smoke", "--problem", "Manual work", "--customer", "Operators"]);
    assert.equal(added.code, 0);
    const listed = await runCli(cwd, ["opportunity", "list"]);
    assert.equal(listed.code, 0);
    const opportunities = JSON.parse(listed.stdout) as Array<{title:string}>;
    assert.equal(opportunities.length, 1);
    assert.equal(opportunities[0]?.title, "Smoke");
    const created = JSON.parse(added.stdout) as {id:string};
    const dossier = await runCli(cwd, ["opportunity", "dossier", created.id]);
    assert.equal(dossier.code, 0);
    assert.match(dossier.stdout, /"decision"/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
