# Vercel Deployment Contract

Forge's browser surface is a static application. It requires no runtime secrets and no backend service.

## Intended configuration

- Framework: static / other
- Output: repository root
- Entry point: index.html
- Production source: main
- No environment variables are required by the current web surface.

## Required verification

A deployment is not considered verified merely because Vercel accepts a build. The exact main commit must be reconciled with the deployed artifact, then the live URL must be browser-tested for first render, console errors, responsive layout, opportunity creation, dossier navigation, evidence capture, validation gate, persistence after reload, malformed/oversized input handling, and deletion.

If deployment access is unavailable, the repository must not claim that production deployment is complete.
