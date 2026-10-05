# Forge

**Evidence-backed project state for AI-assisted software work.**

Forge exists to stop a software project from being declared complete merely because an agent wrote code or said it finished.

```text
UNDERSTAND → BUILD / CHANGE → VERIFY
       ↑                    ↓
       └──── evidence-backed state ────┘
```

A declaration is context. Execution evidence is proof.

## Canonical workflow

### 1. Understand
`forge scan [project-path]` inspects the project that actually exists. It inventories manifests, test files, CI workflows, deployment configuration and package scripts without claiming any of them work.

```bash
npm ci
npm run build
node dist/src/cli.js scan .
```

### 2. Build / Change
Make the smallest justified change required by the recovered project mission. Forge does not treat a diff, commit, pull request or agent message as completion evidence.

### 3. Verify
Supply structured evidence and ask Forge to evaluate a concrete claim.

```bash
node dist/src/cli.js verify tests-pass --evidence evidence.json
node dist/src/cli.js verify build-works --evidence evidence.json
node dist/src/cli.js verify deployment-works --evidence evidence.json
node dist/src/cli.js verify requirement-satisfied --evidence evidence.json
node dist/src/cli.js verify project-complete --evidence evidence.json
```

Current verdicts are:

| Verdict | Meaning |
|---|---|
| `PROVEN` | The supplied execution evidence supports the claim. |
| `PARTIAL` | Some evidence exists, but an important proof boundary remains. |
| `UNVERIFIED` | The required evidence was not supplied. |
| `DISPROVEN` | Supplied evidence contradicts the claim. |

## Verification boundaries

Forge deliberately rejects common false-completion shortcuts:

- Agent says “tests pass” → **UNVERIFIED**.
- Test command exits non-zero → **DISPROVEN**.
- Deployment returns HTTP 200 without source provenance → **PARTIAL**.
- Healthy deployment runs the wrong commit → **DISPROVEN**.
- “Project complete” without an explicit requirement set → **UNVERIFIED**.
- Requirements are proven but executable test/build evidence is missing → **UNVERIFIED**.

The current structured evidence model supports command executions, deployment observations, requirement verification records and non-evidentiary declarations.

## Repository verification

```bash
npm run typecheck
npm run build
npm test
npm run verify:release
npm run verify:web
npm audit --audit-level=high
```

GitHub CI runs the repository verification suite on supported Node versions.

## Legacy opportunity engine

This repository previously pivoted into an evidence-first opportunity-discovery product. That implementation remains in the repository for history and migration safety, but it is **not the canonical Forge mission**.

Its opportunity CLI commands and browser workspace should be treated as legacy/experimental until they are either extracted into a separate product or deliberately removed after their useful components are migrated. Their presence does not redefine Forge.

## Production state

Forge is currently a CLI/library verification layer. A hosted UI is not required to prove the core product. No production web deployment is claimed until a deployment is created from the canonical project-verification surface and reconciled to the exact Git commit.

## Security

Do not commit credentials, tokens, customer information or private evidence. Evidence files should contain the minimum material required to prove the claim.

See [SECURITY.md](SECURITY.md) and [PROJECT_STATE.md](PROJECT_STATE.md).

## License

MIT.
