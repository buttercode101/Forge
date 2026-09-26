# Forge Architecture

Forge has two deliberate layers.

## Domain engine
The TypeScript engine is the canonical source for opportunity models, evidence handling, harvesting, intelligence, synthesis, challenge, validation, persistence, and release verification.

## Web surface
The root index.html is a static browser application for capturing and inspecting opportunities. It is deliberately local-first and does not pretend browser state is server-authoritative.

The web surface mirrors opportunity, evidence, provenance, confidence, challenge/decision, validation, and lifecycle stage concepts.

## Boundary rule
The web UI may collect and display state, but production claims must ultimately be backed by the domain engine evidence model and release verification. Browser localStorage is not a substitute for the persistent domain store.

## Trust model
VERIFIED is an explicit evidence state. A confidence number never upgrades evidence into proof. Validation is a gated transition, not a visual score.

## Deployment boundary
The web surface can be deployed as static content. No secrets or private backend credentials belong in the browser bundle.
