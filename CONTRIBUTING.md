# Contributing

1. Fork and create a branch.
2. `npm install`, then make your change with tests (provider tests should use recorded fixtures, not live network calls).
3. Ensure `npm run lint && npm run typecheck && npm test` pass.
4. Open a PR describing the change.

New scrapers must respect the target site's robots.txt and terms of service, throttle requests, and ship disabled by default.
