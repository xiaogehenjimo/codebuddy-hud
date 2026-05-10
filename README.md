# CodeBuddy HUD

[![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![StatusLine](https://img.shields.io/badge/CodeBuddy-statusLine-purple)](https://github.com/xiaogehenjimo/codebuddy-hud)

[![English](https://img.shields.io/badge/lang-English-blue)](README.md)
[![简体中文](https://img.shields.io/badge/lang-简体中文-red)](README.zh-CN.md)

A multi-line terminal HUD for CodeBuddy Code, inspired by the focused terminal experience of `claude-hud`.

CodeBuddy HUD runs as a native CodeBuddy `statusLine` command. It reads the JSON payload CodeBuddy sends on stdin, parses the session transcript when available, and renders a compact dashboard directly in your terminal.

```text
CodeBuddy · GPT-5.5 · live-iOS · git release/3.43.0 *
ctx █░░░░░░░░░░░░░░░ 9.2% · tok 91.7K/1M · cache 5.8M · Changes +168 -1
tok in 715.9K · out 22.9K · tools Read×2 Bash×1 Glob×1 Grep×1 · agents 0 · tasks ████████ 1/1
```

## What it shows

| Area | Source | Example |
| --- | --- | --- |
| Model and workspace | CodeBuddy statusLine JSON | `GPT-5.5 · live-iOS` |
| Git state | Local git command | `git main *` |
| Context health | `context_window.*` | `91.7K/1M · 9.2%` |
| Cache tokens | `current_usage.cache_*` | `cache 5.8M` |
| Token totals | `total_input_tokens`, `total_output_tokens` | `in 715.9K · out 22.9K` |
| Code changes | `cost.total_lines_*` | `Changes +168 -1` |
| Tool activity | Transcript JSONL | `tools Read×2 Bash×1` |
| Agents and tasks | Transcript JSONL | `agents 1 · tasks 2/5` |
| Credits/quota | Official fields, snapshot, or transcript estimate | Hidden by default, configurable |

## Requirements

- CodeBuddy Code with `statusLine.command` support
- Node.js `>=18.0.0`
- Git installed if you want branch/dirty status
- No production npm dependencies

## Quick install

Clone the repository:

```bash
git clone https://github.com/xiaogehenjimo/codebuddy-hud.git ~/.codebuddy/plugins/codebuddy-hud
```

Enable it in CodeBuddy:

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js setup
```

The setup command updates `~/.codebuddy/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /Users/you/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js status"
  }
}
```

It also stores the previous `statusLine` in `.meta.json` for rollback.

## Commands

```bash
codebuddy-hud status       # render HUD from stdin JSON
codebuddy-hud inspect      # inspect statusLine JSON fields
codebuddy-hud setup        # install into ~/.codebuddy/settings.json
codebuddy-hud uninstall    # restore previous statusLine
codebuddy-hud config-path  # print active config path
codebuddy-hud configure    # manage HUD configuration
```

If the package is not linked globally, call the script directly:

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js status
```

## Configuration

The first run creates `config.json` next to the plugin. A clean example is tracked as `config.example.json`.

CodeBuddy statusLine rendering may be constrained by the CodeBuddy UI, not by Ghostty or the shell. If your CodeBuddy terminal only shows one or two lines, set `maxLines` lower and keep the most important segments near the top. The plugin defaults to 4 output lines:

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure list
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure get display.showCredits
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set maxLines 4
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set language en
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set language zh
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.enabled true
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.totalCredits 500
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.usedCreditsOffset 100
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set barWidth 20
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure toggle display.showCredits
```

Presets:

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure preset minimal
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure preset default
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure preset full
```

Language:

| Value | Description |
| --- | --- |
| `zh` | Chinese HUD labels and CLI messages |
| `en` | English HUD labels and CLI messages |

`language` only changes HUD labels and command output. It does not translate model names, branch names, tool names, or token units.

Estimated credits/quota are hidden by default. Enable the display flag first, then configure a source:

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set display.showCredits true
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.enabled true
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.totalCredits 500
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.usedCreditsOffset 0
```

Formula when official fields are not available:

```text
remaining = totalCredits - usedCreditsOffset - localTranscriptCredits
```

CodeBuddy HUD will prefer official credit/billing fields from the statusLine JSON if CodeBuddy exposes them in the future, including common shapes such as `credits.remaining_credits`, `credits.total_credits`, `billing.remainingCredits`, `billing.totalCredits`, `plan.*`, or `quota.*`.

If official fields are missing, HUD can read an explicit local quota snapshot file:

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.snapshotPath ~/.codebuddy/quota.json
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.maxStalenessMs 3600000
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.refreshCommand 'your trusted command that writes ~/.codebuddy/quota.json'
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js quota refresh
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js quota status
```

Snapshot example:

```json
{
  "quota": {
    "remaining": 75,
    "used": 25,
    "total": 100,
    "plan": "Pro",
    "resetAt": "2026-06-01T00:00:00Z",
    "updatedAt": "2026-05-10T06:00:00Z"
  }
}
```

If both official fields and snapshot are missing, it falls back to the local transcript estimate. The local estimate is not an official account balance and may miss usage from other machines, projects, or cleaned transcripts. HUD never reads credentials or calls undocumented APIs during `status` rendering. `refreshCommand` is only executed by the explicit `quota refresh` command.

Important display flags:

| Flag | Default | Description |
| --- | --- | --- |
| `display.showContext` | `true` | Context usage line |
| `display.showTokens` | `true` | Input/output token totals |
| `display.showCache` | `true` | Prompt/cache token segment |
| `display.showCost` | `false` | USD cost from CodeBuddy when available |
| `display.showCredits` | `false` | Credit/quota segment from official fields, snapshot, or transcript estimate |
| `display.showTools` | `true` | Tool call counts from transcript, rendered on the token totals line |
| `display.showAgents` | `true` | Agent call count, rendered on the token totals line |
| `display.showTasks` | `true` | Task progress, rendered on the token totals line |
| `colors.enabled` | `true` | ANSI color output |

## Context thresholds

```json
{
  "thresholds": {
    "contextWarning": 70,
    "contextDanger": 90
  }
}
```

The context bar uses normal, warning, and danger colors based on the configured thresholds.

## How it works

```text
CodeBuddy Code
  -> statusLine JSON on stdin
  -> codebuddy-hud status
  -> optional transcript JSONL parsing
  -> git status lookup
  -> ANSI terminal HUD on stdout
```

The status command is defensive by design:

- It never requires transcript parsing to succeed.
- It falls back to stdin-only rendering.
- It avoids external dependencies.
- It keeps runtime state out of git via `.cache.json`, `.meta.json`, and `config.json`.

## Development

```bash
npm run build
npm test
npm run test:stdin
```

Local smoke test:

```bash
node bin/codebuddy-hud.js status < tests/fixtures/status.json
```

## Rollback

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js uninstall
```

Manual rollback example:

```json
{
  "statusLine": {
    "type": "command",
    "command": "/bin/sh /Users/you/.codebuddy/statusline-ys.sh"
  }
}
```

## Credits and attribution

This project is inspired by the terminal HUD idea and repository polish of `jarrodwatts/claude-hud`, but it is an independent CodeBuddy Code implementation.

## License

Apache-2.0. See [LICENSE](LICENSE).
