import { assessOpportunity, Opportunity, OpportunityAssessment } from "./opportunity.js";
import { analyzeOpportunity, OpportunityIntelligence } from "./intelligence.js";
import { generateChallenges, Challenge } from "./challenge.js";

export interface OpportunityDossier {
  opportunity: Opportunity;
  assessment: OpportunityAssessment;
  intelligence: OpportunityIntelligence;
  challenges: Challenge[];
  decision: "RESEARCH" | "CHALLENGE" | "VALIDATE" | "HOLD";
  decisionReason: string[];
}

export function buildDossier(o: Opportunity, now = new Date()): OpportunityDossier {
  const assessment = assessOpportunity(o);
  const intelligence = analyzeOpportunity(o, now);
  const challenges = generateChallenges(o);
  const reasons: string[] = [];

  if (!intelligence.researchReady) {
    reasons.push(...intelligence.blockers);
  }

  if (assessment.validation === 0) {
    reasons.push("No meaningful customer validation activity recorded.");
  }

  if (assessment.proof === 0) {
    reasons.push("No commercial proof is currently recorded.");
  }

  let decision: OpportunityDossier["decision"] = "HOLD";
  if (!intelligence.researchReady) decision = "RESEARCH";
  else if (assessment.proof === 0 || assessment.validation < 0.25) decision = "CHALLENGE";
  else if (assessment.validation < 0.75) decision = "VALIDATE";
  else decision = "VALIDATE";

  return { opportunity: o, assessment, intelligence, challenges, decision, decisionReason: reasons };
}
