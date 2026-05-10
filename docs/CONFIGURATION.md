# Configuration

CodeBuddy HUD stores user configuration in `config.json` next to the plugin. The repository tracks `config.example.json`; runtime `config.json` is ignored by git.

## Commands

```bash
node bin/codebuddy-hud.js configure list
node bin/codebuddy-hud.js configure get display.showCredits
node bin/codebuddy-hud.js configure set language en
node bin/codebuddy-hud.js configure set language zh
node bin/codebuddy-hud.js configure set credits.enabled true
node bin/codebuddy-hud.js configure set credits.totalCredits 500
node bin/codebuddy-hud.js configure set credits.usedCreditsOffset 100
node bin/codebuddy-hud.js configure set barWidth 20
node bin/codebuddy-hud.js configure toggle display.showCredits
node bin/codebuddy-hud.js configure preset minimal
node bin/codebuddy-hud.js configure reset
```

`configure` can be shortened to `config`.

## Language

```json
{
  "language": "zh"
}
```

| Value | Description |
| --- | --- |
| `zh` | Chinese HUD labels and CLI messages |
| `en` | English HUD labels and CLI messages |

`language` does not translate model names, branch names, tool names, paths, or token units.

## Estimated credits

```json
{
  "credits": {
    "enabled": false,
    "totalCredits": 0,
    "usedCreditsOffset": 0
  }
}
```

Enable estimated remaining credits:

```bash
node bin/codebuddy-hud.js configure set credits.enabled true
node bin/codebuddy-hud.js configure set credits.totalCredits 500
node bin/codebuddy-hud.js configure set credits.usedCreditsOffset 0
```

Formula:

```text
remaining = totalCredits - usedCreditsOffset - localTranscriptCredits
```

This is a local estimate from transcript data, not an official account balance.

## Presets

| Preset | Purpose |
| --- | --- |
| `minimal` | Context and token HUD with activity lines disabled |
| `default` | Balanced multi-line HUD |
| `full` | Enables cost display and wider bars; credits remain opt-in |

## Environment overrides

Useful for tests or custom installs:

| Variable | Description |
| --- | --- |
| `CODEBUDDY_HUD_CONFIG` | Override config file path |
| `CODEBUDDY_HUD_CACHE` | Override cache file path |
| `CODEBUDDY_HUD_META` | Override setup metadata path |
| `CODEBUDDY_SETTINGS_PATH` | Override CodeBuddy settings file path |
