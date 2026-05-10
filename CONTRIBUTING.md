# Contributing

Thanks for improving CodeBuddy HUD.

## Ground rules

- Keep production dependencies at zero unless there is a clear reason.
- Keep `status` rendering fast and safe; it runs frequently in the terminal.
- Do not commit runtime files: `config.json`, `.cache.json`, `.meta.json`.
- Add tests for behavior changes.
- Prefer small focused PRs.

## Setup

```bash
git clone https://github.com/xiaogehenjimo/codebuddy-hud.git
cd codebuddy-hud
npm test
```

## Before submitting

```bash
npm run build
npm test
npm run test:stdin
```
