import test from "node:test";
import assert from "node:assert/strict";
import { analyzeEvidence, analyzeOpportunity } from "../src/domain/intelligence.js";

const e = (id:string, source:string, claim:string, kind:any="complaint", state:any="VERIFIED") => ({
  id, source, claim, kind, state, observedAt:new Date().toISOString(), confidence:0.9
});

test("intelligence measures independent corroboration", () => {
  const report = analyzeEvidence([
    e("1","review","Clinics cannot get reports quickly"),
    e("2","community","Clinics cannot get reports quickly"),
    e("3","internal","Old observation", "pain", "STALE")
  ]);
  assert.equal(report.independentSources, 3);
  assert.equal(report.corroboratedClaims.length, 1);
  assert.equal(report.staleEvidence.length, 1);
});

test("opportunity intelligence blocks unresolved unknowns", () => {
  const o:any = {
    id:"o1", title:"x", problem:"x", customer:"clinics",
    existingSolutions:[], differentiators:[], stage:"captured",
    createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
    validation:{customerConversations:0,waitlistSignups:0,trials:0,paidCustomers:0,paymentEvidence:0},
    evidence:[e("1","review","Clinics need reports quickly"), e("2","community","Clinics need reports quickly","complaint","UNKNOWN")]
  };
  const result=analyzeOpportunity(o);
  assert.equal(result.researchReady,false);
  assert.ok(result.blockers.some(x=>x.includes("Resolve unknown")));
});
