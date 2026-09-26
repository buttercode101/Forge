# Forge

Forge is an evidence-first opportunity discovery engine. It turns research signals into traceable opportunity dossiers and enforces explicit evidence gates before validation.

## Implemented flow

**DISCOVER → HARVEST → NORMALIZE → EVIDENCE → INTELLIGENCE → SYNTHESIZE → DOSSIER → CHALLENGE → VALIDATE**

Implemented today:

- persistent local opportunity state
- evidence provenance, confidence and verification states
- source-isolated harvesting with duplicate handling
- semantic-ish signal clustering and independent-source counts
- corroboration and contradiction detection
- evidence freshness checks
- evidence-backed opportunity synthesis
- duplicate opportunity candidate detection
- challenge generation
- validation gates
- atomic local state writes and schema validation
- live public research adapters for Hacker News and Reddit
- CLI orchestration

## Evidence rules

Forge distinguishes:

- **VERIFIED** — evidence has been explicitly verified and, where applicable, carries a verification timestamp.
- **CLAIMED** — a sourced assertion that has not been independently verified.
- **UNKNOWN** — unresolved evidence that may affect a decision.
- **STALE** — evidence explicitly marked stale or older than the freshness window.

Community and founder claims remain claims. Source reliability affects confidence; it does not manufacture proof.

Validation requires verified commercial/customer evidence, or recorded paid customers backed by payment evidence, at least three direct customer/problem conversations, and no unresolved unknown or stale evidence.

## CLI

```bash
forge research "clinic reporting" --geography "South Africa"
forge opportunity add "Example" --problem "Problem" --customer "Customer"
forge opportunity list
forge opportunity assess <id>
forge opportunity challenge <id>
forge opportunity dossier <id>
forge opportunity evidence <id> --kind complaint --claim "Observed pain" --source "customer-review" --confidence 0.7
forge opportunity validation <id> --conversations 3 --paid 1 --payments 1
forge opportunity validate <id>
forge opportunity transition <id> validated
```

## Live research

The current live connectors are:

- Hacker News
- Reddit

Public-source collection is deliberately bounded by request timeout, response-size limits and adapter failure isolation. Retrieved URLs and timestamps are retained as provenance.

## Verification

CI runs TypeScript compilation, the full Node test suite, and a high-severity npm audit on Node 22.

The repository is currently a **CLI/domain engine**, not a web application. Execution, verification and handoff of built products are intentionally outside this core engine; the validated opportunity state is the handoff boundary for downstream execution.
