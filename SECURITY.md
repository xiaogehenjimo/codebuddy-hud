# Security Policy

## Reporting a vulnerability

Please report security issues privately to the repository owner instead of opening a public issue.

## Scope

CodeBuddy HUD reads local CodeBuddy statusLine JSON and optional transcript files. It should not transmit data to external services.

## Security expectations

- Do not add network calls to the status renderer.
- Do not print secrets from transcripts.
- Keep setup/uninstall limited to the configured CodeBuddy settings file.
- Avoid shelling out except for read-only git status operations.
