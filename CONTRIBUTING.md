# Contributing

Thanks for taking the time to contribute.

## Before opening a pull request

1. Read the repository README and relevant architecture/security documentation.
2. Keep changes focused and explain the user-visible or correctness impact.
3. Do not commit secrets, credentials, private evidence, generated state, or local databases.
4. Add or update tests for behavior that changes.
5. Run the repository verification commands locally.

## Pull requests

A pull request should include:

- what changed
- why it changed
- how it was verified
- any compatibility or migration considerations
- screenshots for meaningful UI changes, when useful

Keep the default branch releasable. Avoid speculative features that are not supported by the project's documented scope.

## Security issues

Do not disclose vulnerabilities in public issues. Follow the repository's SECURITY.md reporting guidance.

## Code quality

Prefer small, explicit changes over clever abstractions. Preserve existing boundaries, deterministic behavior and documented security assumptions.
