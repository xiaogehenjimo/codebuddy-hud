# Testing

CodeBuddy HUD uses the built-in Node.js test runner.

```bash
npm test
```

Coverage:

```bash
npm run test:coverage
```

Fixture stdin smoke test:

```bash
npm run test:stdin
```

Tests should isolate runtime state using:

```text
CODEBUDDY_HUD_CONFIG
CODEBUDDY_HUD_CACHE
CODEBUDDY_HUD_META
CODEBUDDY_SETTINGS_PATH
```
