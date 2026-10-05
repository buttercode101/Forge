# Forge Project State

## Canonical mission

Forge is the evidence-backed project-state layer for AI-assisted software projects:

```text
UNDERSTAND → BUILD / CHANGE → VERIFY
```

The project must never equate implementation, a commit, CI existence, deployment existence or an agent declaration with completion.

## Proven current capabilities

- Deterministic project scanning inventories manifests, tests, CI workflows, deployment configuration and package scripts.
- Structured verification supports tests-pass, build-works, deployment-works, requirement-satisfied and project-complete claims.
- Verdicts are PROVEN, PARTIAL, UNVERIFIED or DISPROVEN.
- Declarations cannot prove executable claims.
- Deployment provenance mismatch disproves a deployment claim.
- Project completion requires explicit proven requirements plus executable test and build evidence.
- Adversarial regression tests cover these trust boundaries.
- GitHub CI verifies build, type safety, tests, release checks, dependency security and repository hygiene.

## Legacy boundary

The opportunity-discovery domain engine and static browser workspace predate restoration of the canonical Forge mission. They remain in-tree to avoid destructive history loss, but are not the canonical product contract and must not be used as evidence that Forge's project-verification lifecycle is complete.

## Remaining implementation work

- Persist project scans and verification results in a versioned project-state file.
- Add a plan/change record so BUILD/CHANGE has explicit state rather than only process guidance.
- Bind command evidence to commit SHA and execution timestamp.
- Add a verification adapter that can ingest CI/deployment observations without trusting declarations.
- Only then consider a dedicated hosted UI.

## Production gate

Forge is production-ready only when its canonical project-state lifecycle is executable end-to-end, regression-tested, and any claimed deployment is reconciled to the exact source commit. A legacy opportunity UI deployment does not satisfy this gate.
