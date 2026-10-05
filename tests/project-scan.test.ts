import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanProject } from "../src/project/scan.js";

test("scan reports tests workflows and deployment configuration without claiming they passed", async () => {
  const root=await mkdtemp(join(tmpdir(),"forge-scan-"));
  await mkdir(join(root,"tests")); await mkdir(join(root,".github","workflows"),{recursive:true});
  await writeFile(join(root,"package.json"),JSON.stringify({scripts:{test:"node --test",build:"tsc"}}));
  await writeFile(join(root,"tests","a.test.ts"),"");
  await writeFile(join(root,".github","workflows","ci.yml"),"name: ci");
  await writeFile(join(root,"vercel.json"),"{}");
  const result=await scanProject(root);
  assert.equal(result.files,4);
  assert.deepEqual(result.testFiles,["tests/a.test.ts"]);
  assert.deepEqual(result.workflows,[".github/workflows/ci.yml"]);
  assert.deepEqual(result.deploymentConfigs,["vercel.json"]);
  assert.equal(result.scripts.test,"node --test");
});
