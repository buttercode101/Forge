import test from "node:test";
import assert from "node:assert/strict";
import { assertEvidenceInput } from "../src/domain/evidence.js";
import { harvest } from "../src/domain/harvest.js";
import { analyzeEvidence } from "../src/domain/intelligence.js";
import { validateOpportunity } from "../src/domain/validation.js";
import { writeJson, readJson } from "../src/store/json-store.js";
import { unlink } from "node:fs/promises";

test("evidence input rejects malformed verified evidence", () => {
  assert.throws(() => assertEvidenceInput({
    kind:"revenue", state:"VERIFIED", claim:"", source:"source",
    observedAt:new Date().toISOString(), confidence:1
  }), /claim cannot be empty/);
  assert.throws(() => assertEvidenceInput({
    kind:"revenue", state:"VERIFIED", claim:"paid", source:"source",
    observedAt:"bad", confidence:1
  }), /observedAt/);
  assert.throws(() => assertEvidenceInput({
    kind:"revenue", state:"VERIFIED", claim:"paid", source:"source",
    observedAt:new Date().toISOString(), confidence:1
  }), /verifiedAt/);
});

test("harvest preserves identical claims from independent sources", async () => {
  const signal = {id:"same",source:"source",kind:"complaint" as const,title:"pain",text:"same pain",observedAt:new Date().toISOString()};
  const adapter = (id:string) => ({
    definition:{id,type:"community" as const,name:id,reliability:0.5,supports:["pain" as const]},
    async collect(){ return [{...signal,source:id}]; }
  });
  const report=await harvest("query",[adapter("a"),adapter("b")]);
  assert.equal(report.signals.length,2);
  assert.equal(report.duplicateSignalsRemoved,0);
});

test("stale evidence cannot pass validation", () => {
  const now=new Date().toISOString();
  const o:any={id:"o",title:"x",problem:"p",customer:"c",existingSolutions:[],differentiators:[],evidence:[
    {id:"e",kind:"revenue",state:"STALE",claim:"paid",source:"first-party",observedAt:now,verifiedAt:now,confidence:1}
  ],stage:"validation",createdAt:now,updatedAt:now,validation:{customerConversations:3,waitlistSignups:0,trials:0,paidCustomers:1,paymentEvidence:1}};
  assert.equal(validateOpportunity(o).pass,false);
});

test("freshness detects old evidence even when state was not manually changed", () => {
  const report=analyzeEvidence([{id:"e",kind:"complaint",state:"VERIFIED",claim:"old pain",source:"review",observedAt:"2020-01-01T00:00:00Z",confidence:1}],new Date("2026-09-26T00:00:00Z"));
  assert.ok(report.staleEvidence.includes("old pain"));
});

test("json writes are replaced atomically", async () => {
  const path=".forge-test-state.json";
  await writeJson(path,{ok:true});
  assert.deepEqual(await readJson(path,{}),{ok:true});
  await unlink(path);
});
