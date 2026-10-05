import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initialProjectState, readProjectState, writeProjectState } from "../src/project/state.js";

test("project state round-trips with an explicit schema", async () => {
  const dir=await mkdtemp(join(tmpdir(),"forge-state-"));
  const path=join(dir,".forge","state.json");
  const state=initialProjectState(dir);
  state.plans.push({id:"plan-1",goal:"Ship safely",requirements:["Tests pass","Deployment matches source"],createdAt:"2026-10-05T00:00:00.000Z"});\n  state.changes.push({id:"change-1",summary:"repair CI",createdAt:"2026-10-05T00:00:00.000Z",commit:"abc"});
  await writeProjectState(path,state);
  const loaded=await readProjectState(path);
  assert.equal(loaded?.schemaVersion,1);
  assert.equal(loaded?.changes[0].commit,"abc");\n  assert.deepEqual(loaded?.plans[0].requirements,["Tests pass","Deployment matches source"]);
});

test("missing state is not silently invented", async () => {
  const dir=await mkdtemp(join(tmpdir(),"forge-state-missing-"));
  assert.equal(await readProjectState(join(dir,"none.json")),null);
});
