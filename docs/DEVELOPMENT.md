# Development

## Local checks

```bash
npm run build
npm test
npm run test:stdin
```

## Manual smoke test

```bash
node bin/codebuddy-hud.js status < tests/fixtures/status.json
node bin/codebuddy-hud.js inspect < tests/fixtures/status.json
node bin/codebuddy-hud.js configure list
```

## Runtime files

These files are generated locally and should not be committed:

```text
config.json
.cache.json
.meta.json
```

## Design constraints

- Keep the status command fast and synchronous.
- Do not add production dependencies unless absolutely necessary.
- Treat CodeBuddy stdin JSON as authoritative.
- Transcript parsing must be optional and failure-tolerant.
