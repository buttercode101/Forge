# Forge Project State

## Current state

- The repository is private and the default branch is main.
- The TypeScript opportunity engine has release verification, strict typechecking, tests, dependency audit, and pinned GitHub Actions.
- A functional responsive browser application exists at index.html.
- Browser persistence is versioned and defensive against malformed local state.
- User-controlled text is escaped before HTML rendering.
- Web validation requires stronger evidence before entering validated.
- The web surface contains no fabricated evidence or live customer/revenue claims.

## Known boundary
The browser application is local-first. It is not a hosted multi-user database and does not claim server-side synchronization.

## Production gate
A release is only production-verified when GitHub CI is green, release and proof verification pass, the web bundle is structurally verified, a Vercel deployment exists for the current commit, the deployed URL is exercised at mobile/tablet/desktop widths, core capture/persistence/evidence/validation/destructive flows are exercised, and the deployed commit is reconciled with main.

Unverified deployment status must remain explicitly unknown.
