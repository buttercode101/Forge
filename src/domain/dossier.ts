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
  const reasons = [...intelligence.blockers, ...assessment.unresolvedRisks];

  let decision: OpportunityDossier["decision"] = "HOLD";
  if (!intelligence.researchReady) decision = "RESEARCH";
  else if (assessment.proof === 0 || assessment.validation < 0.25) decision = "CHALLENGE";
  else decision = "VALIDATE";

  return {
    opportunity: o,
    assessment,
    intelligence,
    challenges,
    decision,
    decisionReason: [...new Set(reasons)]
  };
}
