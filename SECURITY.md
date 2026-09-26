# Forge Security Model

## Security goals
Forge protects the integrity of opportunity records, evidence provenance, validation gates, and persisted local state.

Forge does not claim that a sourced assertion is true merely because it has a URL, confidence value, or community origin. Evidence state and provenance remain explicit.

## Web security boundary
The browser application is a static, local-first surface. It stores user-created state in browser localStorage under a versioned key. No server-side secrets are embedded in the page.

The UI HTML-escapes user-controlled values, bounds text/evidence/opportunity counts, rejects malformed persisted state, validates numeric values, restricts lifecycle stages, and requires verified commercial/customer evidence plus the validation threshold before the validated stage.

localStorage is not a security boundary. A user who controls the browser can modify it. Forge therefore treats browser state as user-controlled input, not authoritative external proof.

## Evidence boundary
CLAIMED, UNKNOWN, and STALE evidence must not be presented as verified proof. Commercial evidence is evidence, not automatic truth.

## Reporting
Do not commit credentials, API keys, tokens, customer secrets, or private evidence. Report suspected vulnerabilities privately to the repository owner before public disclosure.
