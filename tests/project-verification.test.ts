import test from "node:test";
import assert from "node:assert/strict";
import { verifyClaim, type Evidence } from "../src/project/verification.js";

test("declarations never prove tests", () => {
  const evidence: Evidence[] = [{type:"declaration", text:"implemented and all tests pass"}];
  assert.equal(verifyClaim("tests-pass", evidence).verdict, "UNVERIFIED");
});

test("failed execution disproves a tests-pass claim", () => {
  const evidence: Evidence[] = [{type:"command", command:"npm test", exitCode:1}];
  assert.equal(verifyClaim("tests-pass", evidence).verdict, "DISPROVEN");
});

test("healthy deployment without commit provenance is only partial", () => {
  const evidence: Evidence[] = [{type:"deployment", status:200, route:"/"}];
  assert.equal(verifyClaim("deployment-works", evidence).verdict, "PARTIAL");
});

test("deployment must match expected commit", () => {
  const evidence: Evidence[] = [{type:"deployment", status:200, deployedCommit:"old", expectedCommit:"new"}];
  assert.equal(verifyClaim("deployment-works", evidence).verdict, "DISPROVEN");
});

test("project completion requires requirements plus execution evidence", () => {
  const base: Evidence[] = [{type:"requirement", id:"R1", verdict:"PROVEN", evidenceIds:["e1"]}];
  assert.equal(verifyClaim("project-complete", base).verdict, "UNVERIFIED");
  const complete: Evidence[] = [...base,
    {type:"command", command:"npm test", exitCode:0},
    {type:"command", command:"npm run build", exitCode:0}
  ];
  assert.equal(verifyClaim("project-complete", complete).verdict, "PROVEN");
});
