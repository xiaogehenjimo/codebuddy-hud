# `/codebuddy-hud:configure`

Manage HUD display settings.

Equivalent shell commands:

```bash
node bin/codebuddy-hud.js configure list
node bin/codebuddy-hud.js configure get display.showCredits
node bin/codebuddy-hud.js configure set language en
node bin/codebuddy-hud.js configure set language zh
node bin/codebuddy-hud.js configure set maxLines 4
node bin/codebuddy-hud.js configure set credits.enabled true
node bin/codebuddy-hud.js configure set credits.totalCredits 500
node bin/codebuddy-hud.js configure set credits.usedCreditsOffset 100
node bin/codebuddy-hud.js configure set credits.snapshotPath ~/.codebuddy/quota.json
node bin/codebuddy-hud.js configure set credits.refreshCommand 'your trusted command that writes ~/.codebuddy/quota.json'
node bin/codebuddy-hud.js quota refresh
node bin/codebuddy-hud.js quota status
node bin/codebuddy-hud.js configure set credits.warningRemainingPercent 25
node bin/codebuddy-hud.js configure set credits.dangerRemainingPercent 10
node bin/codebuddy-hud.js configure toggle display.showCredits
node bin/codebuddy-hud.js configure set barWidth 20
node bin/codebuddy-hud.js configure preset full
```
