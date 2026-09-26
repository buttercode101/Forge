import test from "node:test";
import assert from "node:assert/strict";
import { buildDossier } from "../src/domain/dossier.js";

test("dossier exposes a complete evidence-backed decision surface", () => {
  const now = new Date().toISOString();
  const o: import("../src/domain/opportunity.js").Opportunity = {
    id:"o1", title:"Reporting", problem:"Slow reports", customer:"Clinics",
    existingSolutions:["Manual workflow"], differentiators:[],
    stage:"captured", createdAt:now, updatedAt:now,
    validation:{customerConversations:0,waitlistSignups:0,trials:0,paidCustomers:0,paymentEvidence:0},
    evidence:[
      {id:"1",kind:"complaint",state:"VERIFIED",claim:"Clinics wait too long for reports",source:"review",observedAt:now,confidence:0.9},
      {id:"2",kind:"revenue",state:"VERIFIED",claim:"Clinics pay for reporting",source:"marketplace",observedAt:now,confidence:0.8},
      {id:"3",kind:"customer",state:"VERIFIED",claim:"Independent clinics",source:"first-party",observedAt:now,confidence:0.9}
    ]
  };
  const dossier=buildDossier(o);
  assert.ok(dossier.assessment);
  assert.ok(dossier.intelligence);
  assert.ok(dossier.challenges.length > 0);
  assert.ok(["CHALLENGE","VALIDATE","HOLD","RESEARCH"].includes(dossier.decision));
});
