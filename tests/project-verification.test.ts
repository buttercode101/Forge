import test from "node:test";
import assert from "node:assert/strict";
import { verifyClaim, type Evidence } from "../src/project/verification.js";

test("declarations never prove tests", () => {
  const evidence: Evidence[] = [{type:"declaration", text:"implemented and all tests pass"}];
  assert.equal(verifyClaim("tests-pass", evidence).verdict, "UNVERIFIED");
});

test("failed execution disproves a tests-pass claim", () => {
  const evidence: Evidence[] = [{type:"command", command:"npm test", exitCode:1, commit:"abc"}];
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
  const complete: Evidence[] = [
    {type:"requirement", id:"R1", verdict:"PROVEN", evidenceIds:["test-1","build-1"]},
    {type:"command", id:"test-1", command:"npm test", exitCode:0, commit:"abc", requirement:"R1"},
    {type:"command", id:"build-1", command:"npm run build", exitCode:0, commit:"abc", requirement:"R1"}
  ];
  assert.equal(verifyClaim("project-complete", complete).verdict, "PROVEN");
});

test("project completion rejects orphaned evidence references", () => {
  const evidence: Evidence[] = [
    {type:"requirement", id:"R1", verdict:"PROVEN", evidenceIds:["made-up"]},
    {type:"command", id:"test-1", command:"npm test", exitCode:0},
    {type:"command", id:"build-1", command:"npm run build", exitCode:0}
  ];
  assert.equal(verifyClaim("project-complete", evidence).verdict, "UNVERIFIED");
});

test("passing execution without commit provenance is only partial", () => {
  assert.equal(verifyClaim("tests-pass", [{type:"command", command:"npm test", exitCode:0}]).verdict, "PARTIAL");
  assert.equal(verifyClaim("build-works", [{type:"command", command:"npm run build", exitCode:0}]).verdict, "PARTIAL");
});

test("commands that merely mention test or build are not execution proof", () => {
  assert.equal(verifyClaim("tests-pass", [{type:"command", command:"echo test", exitCode:0}]).verdict, "UNVERIFIED");
  assert.equal(verifyClaim("build-works", [{type:"command", command:"echo build", exitCode:0}]).verdict, "UNVERIFIED");
});

test("project completion requires test and build proof from the same commit", () => {
  const evidence: Evidence[] = [
    {type:"requirement", id:"R1", verdict:"PROVEN", evidenceIds:["test-1","build-1"]},
    {type:"command", id:"test-1", command:"npm test", exitCode:0, commit:"old", requirement:"R1"},
    {type:"command", id:"build-1", command:"npm run build", exitCode:0, commit:"new", requirement:"R1"}
  ];
  assert.equal(verifyClaim("project-complete", evidence).verdict, "UNVERIFIED");
});


test("requirement evidence cannot be borrowed from an unrelated requirement", () => {
  const evidence: Evidence[] = [
    {type:"requirement", id:"R1", verdict:"PROVEN", evidenceIds:["test-r2"]},
    {type:"command", id:"test-r2", command:"npm test", exitCode:0, commit:"abc", requirement:"R2"}
  ];
  assert.equal(verifyClaim("requirement-satisfied", evidence).verdict, "UNVERIFIED");
});


test("a successful command with a non-test name cannot prove tests even with commit provenance", () => {
  const evidence: Evidence[] = [{type:"command", command:"npm run lint", exitCode:0, commit:"abc"}];
  assert.equal(verifyClaim("tests-pass", evidence).verdict, "UNVERIFIED");
});

test("a successful command with a non-build name cannot prove a build even with commit provenance", () => {
  const evidence: Evidence[] = [{type:"command", command:"npm run lint", exitCode:0, commit:"abc"}];
  assert.equal(verifyClaim("build-works", evidence).verdict, "UNVERIFIED");
});
