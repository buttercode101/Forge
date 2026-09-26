# Forge

**Evidence-first opportunity discovery and validation.**

Forge turns messy research signals into traceable opportunity dossiers and applies explicit evidence gates before an opportunity can be marked validated.

[Get started](#quick-start) · [Architecture](ARCHITECTURE.md) · [Security](SECURITY.md) · [Project state](PROJECT_STATE.md) · [Changelog](CHANGELOG.md)

## What Forge does

Forge is a research and validation engine for finding opportunities without confusing signals, opinions, or sourced claims with proof.

```text
DISCOVER → HARVEST → NORMALIZE → EVIDENCE → INTELLIGENCE
                                      ↓
SYNTHESIZE → DOSSIER → CHALLENGE → VALIDATE
```

The system keeps evidence provenance explicit, separates claimed information from verified evidence, detects corroboration and contradiction, and requires a defined validation threshold before the lifecycle can advance.

## Core capabilities

- **Opportunity discovery** from research signals.
- **Evidence provenance** with source, confidence, freshness and verification state.
- **Independent-source analysis** for corroboration and contradiction.
- **Evidence-backed synthesis** into opportunity dossiers.
- **Challenge generation** to expose weak assumptions.
- **Validation gates** that prevent unsupported opportunities from being marked validated.
- **Persistent local state** with schema validation and atomic writes.
- **Bounded public research adapters** for Hacker News and Reddit.
- **Responsive browser workspace** for local opportunity capture, evidence review and validation.
- **Portable verification** through independent release/proof checks.

## Evidence model

Forge uses four explicit evidence states:

| State | Meaning |
|---|---|
| `VERIFIED` | Evidence has been explicitly verified and may support a validation decision. |
| `CLAIMED` | A sourced assertion that has not been independently verified. |
| `UNKNOWN` | Evidence is unresolved and may affect a decision. |
| `STALE` | Evidence is explicitly stale or outside the configured freshness window. |

A URL, confidence score, community post, or founder statement does **not** automatically become proof.

## Quick start

### CLI

Requirements: Node.js 20+.

```bash
npm ci
npm run build

node dist/src/cli.js research "clinic reporting" --geography "South Africa"
node dist/src/cli.js opportunity add "Example" --problem "Problem" --customer "Customer"
node dist/src/cli.js opportunity list
node dist/src/cli.js opportunity assess <id>
node dist/src/cli.js opportunity dossier <id>
node dist/src/cli.js opportunity challenge <id>
```

If the package is installed locally as a CLI:

```bash
npm link
forge opportunity list
```

### Browser workspace

The root `index.html` is a local-first browser surface. Open it directly in a browser or serve the repository root with any static HTTP server.

Browser state is stored locally under a versioned `localStorage` key. It is intentionally **not** treated as authoritative external proof.

## Verification

Forge maintains several independent verification layers:

```bash
npm run typecheck
npm test
npm run verify:release
npm run verify:web
npm audit --audit-level=high
```

CI exercises the project across supported Node versions and checks build integrity, tests, release verification, standalone proof verification, browser contract markers, dependency security and repository hygiene.

The verification contract is documented in the repository and is designed to make important claims executable rather than aspirational.

## Architecture

The TypeScript domain engine is the canonical business-logic layer. The browser workspace is a local-first presentation surface with defensive input normalization.

See [ARCHITECTURE.md](ARCHITECTURE.md) for boundaries, [SECURITY.md](SECURITY.md) for the threat model, and [PROJECT_STATE.md](PROJECT_STATE.md) for the current implementation contract.

## Research boundaries

Forge's public-source adapters are deliberately bounded by request timeouts, response-size limits and adapter failure isolation. Retrieved URLs and timestamps are retained as provenance.

Research output is a signal for investigation, not automatic truth.

## Project status

Forge is actively developed. The repository contains a working domain engine, CLI, browser workspace, verification suite and documented security/deployment boundaries.

The production web deployment is intentionally not described here until it is independently verified.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Security

See [SECURITY.md](SECURITY.md). Do not commit credentials, API keys, tokens, customer information or private evidence.

## License

Forge is released under the MIT License. See [LICENSE](LICENSE).
