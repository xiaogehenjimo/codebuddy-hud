# Configuration

CodeBuddy HUD stores user configuration in `config.json` next to the plugin. The repository tracks `config.example.json`; runtime `config.json` is ignored by git.

## Commands

```bash
node bin/codebuddy-hud.js configure list
node bin/codebuddy-hud.js configure get display.showCredits
node bin/codebuddy-hud.js configure set language en
node bin/codebuddy-hud.js configure set language zh
node bin/codebuddy-hud.js configure set maxLines 4
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

## Line count

```json
{
  "maxLines": 4
}
```

`maxLines` limits how many lines the plugin prints. CodeBuddy's statusLine UI may still clip visible lines depending on the terminal/UI layout. If only one or two lines are visible, set `maxLines` to match what CodeBuddy can display.

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

Formula when official fields are absent:

```text
remaining = totalCredits - usedCreditsOffset - localTranscriptCredits
```

Official fields are used first if CodeBuddy exposes them in the statusLine JSON. The lookup is defensive because no public schema is documented yet. Supported candidate shapes include:

```text
credits.remaining_credits / credits.total_credits
credits.remainingCredits / credits.totalCredits
billing.remainingCredits / billing.totalCredits
billing.balanceCredits / billing.totalCredits
plan.remainingCredits / plan.totalCredits
quota.remainingCredits / quota.totalCredits
usedCredits + totalCredits variants
```

If official fields are absent, HUD can read an explicit quota snapshot:

```bash
node bin/codebuddy-hud.js configure set credits.snapshotPath ~/.codebuddy/quota.json
node bin/codebuddy-hud.js configure set credits.refreshCommand 'your trusted command that writes ~/.codebuddy/quota.json'
node bin/codebuddy-hud.js quota refresh
node bin/codebuddy-hud.js quota status
node bin/codebuddy-hud.js configure set credits.maxStalenessMs 3600000
node bin/codebuddy-hud.js configure set credits.warningRemainingPercent 25
node bin/codebuddy-hud.js configure set credits.dangerRemainingPercent 10
```

Snapshot schema:

```json
{
  "quota": {
    "remaining": 75,
    "used": 25,
    "total": 100,
    "addon": 10,
    "plan": "Pro",
    "resetAt": "2026-06-01T00:00:00Z",
    "updatedAt": "2026-05-10T06:00:00Z"
  }
}
```

Source priority:

```text
official statusLine fields > quota snapshot > local transcript estimate
```

`refreshCommand` is never executed during `status` rendering. It only runs when you explicitly call `quota refresh`. HUD does not read credentials or call undocumented APIs by default.

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
