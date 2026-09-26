# Forge

Forge is an evidence-first project and opportunity operator.

It turns real-world signals into traceable opportunities, then carries those opportunities through discovery, challenge, validation, execution, verification, and handoff.

## Core loop

DISCOVER → HARVEST → NORMALIZE → EVIDENCE → SYNTHESIZE → CHALLENGE → VALIDATE → EXECUTE → VERIFY → HANDOFF

Forge does not treat an idea as validated because an LLM likes it. Every important claim is represented as evidence with provenance, confidence, freshness, and verification state.

## Opportunity sources

- Existing work and repeated customer problems
- Proven SaaS categories and competitors
- Revenue/acquisition evidence
- App and integration marketplaces
- Public customer complaints and reviews
- Geographic/localization gaps
- Existing projects and reusable capabilities
- User-provided observations

## Product principles

1. Evidence before enthusiasm.
2. Proven demand before novelty.
3. Context is an advantage.
4. Competition is evidence, not disqualification.
5. Local gaps can be structural opportunities.
6. AI synthesizes evidence; it does not manufacture proof.
7. Every decision remains traceable.
8. Validation happens before expensive execution.
9. Unknown is a valid state.
10. Existing Forge workflow remains intact: understand → plan → change → verify → handoff.

## Executable workflow

The current CLI supports:

- creating and listing opportunities
- assessing evidence coverage and unresolved risks
- generating challenge questions
- recording evidence with verification state and confidence
- recording validation activity
- enforcing the validation gate before an opportunity can enter `validated`
- enforcing the canonical opportunity stage pipeline
- harvesting from multiple source adapters with failure isolation and deduplication

Examples:

```bash
forge opportunity add "Example" --problem "Problem" --customer "Customer"
forge opportunity evidence <id> --kind complaint --claim "Observed pain" --source "customer-review" --confidence 0.7
forge opportunity challenge <id>
forge opportunity validate <id>
forge opportunity validation <id> --conversations 3 --paid 1 --payments 1
forge opportunity transition <id> validated
```

Harvesting deliberately preserves the distinction between a raw signal, a claim, and verified evidence. Source reliability influences confidence but never turns an unverified signal into proof.

## Status

The executable foundation is implemented end-to-end: persistence, harvesting, provenance-aware evidence, clustering, synthesis, intelligence, challenge/validation gates, opportunity dossiers, public research connectors, and CLI orchestration. CI is green. The system remains faithful to the supplied playbook: evidence is collected and synthesized without manufacturing proof.


## Research connectors

Forge can perform live public-source collection through native Node fetch adapters for Hacker News and Reddit. Adapter failures are isolated; successful signals retain source provenance and reliability, then flow through clustering and evidence-preserving synthesis. Public community signals remain research inputs, not payment proof; validation still requires stronger evidence.
