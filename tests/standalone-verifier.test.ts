import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const verifier = join(process.cwd(), "tools", "standalone-verify.mjs");
function run(path: string) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [verifier, path]);
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => resolve({ code: code ?? -1, stdout, stderr }));
  });
}
test("standalone verifier accepts valid state without importing Forge code", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forge-standalone-")), path = join(dir, "state.json");
  await writeFile(path, JSON.stringify({ version:1, opportunities:[{
    id:"o", title:"t", problem:"p", customer:"c", existingSolutions:[], differentiators:[], evidence:[],
    stage:"captured", createdAt:"2026-09-26T00:00:00.000Z", updatedAt:"2026-09-26T00:00:00.000Z",
    validation:{customerConversations:0,waitlistSignups:0,trials:0,paidCustomers:0,paymentEvidence:0}
  }]}));
  const result = await run(path);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /"valid":true/);
  await rm(dir, {recursive:true,force:true});
});
test("standalone verifier rejects a state mutation independently", async () => {
  const dir = await mkdtemp(join(tmpdir(), "forge-standalone-")), path = join(dir, "state.json");
  const state = { version:1, opportunities:[{
    id:"o", title:"t", problem:"p", customer:"c", existingSolutions:[], differentiators:[], evidence:[],
    stage:"captured", createdAt:"2026-09-26T00:00:00.000Z", updatedAt:"2026-09-26T00:00:00.000Z",
    validation:{customerConversations:0,waitlistSignups:0,trials:0,paidCustomers:0,paymentEvidence:0}
  }]};
  await writeFile(path, JSON.stringify(state));
  assert.equal((await run(path)).code, 0);
  state.opportunities[0].validation.paidCustomers = -1;
  await writeFile(path, JSON.stringify(state));
  assert.notEqual((await run(path)).code, 0);
  await rm(dir, {recursive:true,force:true});
});
