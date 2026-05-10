# CodeBuddy HUD

[![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![StatusLine](https://img.shields.io/badge/CodeBuddy-statusLine-purple)](https://github.com/xiaogehenjimo/codebuddy-hud)

[![English](https://img.shields.io/badge/lang-English-blue)](README.md)
[![简体中文](https://img.shields.io/badge/lang-简体中文-red)](README.zh-CN.md)

CodeBuddy HUD 是一个面向 CodeBuddy Code `statusLine` 的多行终端 HUD，灵感来自 `claude-hud` 的终端信息面板体验。

它作为 CodeBuddy 原生 `statusLine.command` 运行，从 stdin 读取 CodeBuddy 传入的 JSON，按需解析本地会话 transcript，并直接在终端底部渲染紧凑的多行状态面板。

```text
CodeBuddy · GPT-5.5 · live-iOS · git release/3.43.0 *
ctx █░░░░░░░░░░░░░░░ 9.2% · tok 91.7K/1M · cache 5.8M
tok in 715.9K · out 22.9K · time 12m49s · api 10m0s · Δ +168 -1
act tools Read×2 Bash×1 Glob×1 Grep×1 · agents 0 · tasks ████████ 1/1
```

## 展示内容

| 区域 | 数据来源 | 示例 |
| --- | --- | --- |
| 模型和项目 | CodeBuddy statusLine JSON | `GPT-5.5 · live-iOS` |
| Git 状态 | 本地 git 命令 | `git main *` |
| 上下文占用 | `context_window.*` | `91.7K/1M · 9.2%` |
| Cache token | `current_usage.cache_*` | `cache 5.8M` |
| Token 总量 | `total_input_tokens`, `total_output_tokens` | `in 715.9K · out 22.9K` |
| 耗时 | `cost.total_duration_ms` | `time 12m49s` |
| 代码变更 | `cost.total_lines_*` | `Δ +168 -1` |
| 工具调用 | transcript JSONL | `Read×2 Bash×1` |
| Agent 和任务 | transcript JSONL | `agents 1 · tasks 2/5` |
| Credits | transcript JSONL | 默认隐藏，可配置开启 |

## 环境要求

- 支持 `statusLine.command` 的 CodeBuddy Code
- Node.js `>=18.0.0`
- 如果要显示分支/dirty 状态，需要安装 Git
- 无生产 npm 依赖

## 快速部署

推荐安装到 CodeBuddy 插件目录：

```bash
git clone https://github.com/xiaogehenjimo/codebuddy-hud.git ~/.codebuddy/plugins/codebuddy-hud
```

启用 HUD：

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js setup
```

`setup` 会更新 `~/.codebuddy/settings.json`：

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /Users/you/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js status"
  }
}
```

同时会把旧的 `statusLine` 保存到 `.meta.json`，方便后续回滚。

## 通过 npm 安装

如果已发布到 npm，也可以使用：

```bash
npm install -g codebuddy-hud
```

然后运行：

```bash
codebuddy-hud setup
```

如果你不想全局安装，也可以在仓库目录中直接使用 Node：

```bash
node bin/codebuddy-hud.js setup
```

## 常用命令

```bash
codebuddy-hud status       # 从 stdin JSON 渲染 HUD
codebuddy-hud inspect      # 查看 statusLine JSON 字段
codebuddy-hud setup        # 写入 ~/.codebuddy/settings.json
codebuddy-hud uninstall    # 恢复之前的 statusLine
codebuddy-hud config-path  # 输出当前配置路径
codebuddy-hud configure    # 管理 HUD 配置
```

如果未全局安装：

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js status
```

## 配置

首次运行会在插件目录生成 `config.json`。仓库内提供干净模板 `config.example.json`。

CodeBuddy statusLine 的可见行数主要受 CodeBuddy UI 约束，不是 Ghostty 或 shell 决定。如果你的 CodeBuddy 终端只显示一两行，可以把 `maxLines` 调低，并把最重要的信息放在前面。插件默认输出 4 行：

查看配置：

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure list
```

读取单个配置：

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure get display.showCredits
```

修改配置：

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set maxLines 4
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set barWidth 20
```

切换语言：

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set language zh
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set language en
```

配置积分剩余估算：

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.enabled true
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.totalCredits 500
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.usedCreditsOffset 0
```

没有官方字段时的计算方式：

```text
剩余积分 = 总积分 - 历史已用偏移 - 本地 transcript 统计积分
```

如果未来 CodeBuddy 在 statusLine JSON 中提供官方积分/账单字段，HUD 会优先读取，例如 `credits.remaining_credits`、`credits.total_credits`、`billing.remainingCredits`、`billing.totalCredits`、`plan.*` 或 `quota.*`。

如果官方字段不存在，HUD 可以读取你显式配置的本地配额快照：

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.snapshotPath ~/.codebuddy/quota.json
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.maxStalenessMs 3600000
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure set credits.refreshCommand '你信任的、会写入 ~/.codebuddy/quota.json 的命令'
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js quota refresh
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js quota status
```

快照示例：

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

如果官方字段和快照都不存在，则回退到本地 transcript 估算。本地估算不是官方账号余额。其它机器、其它项目或已清理 transcript 的消耗可能无法统计。HUD 在 `status` 渲染期间不会读取凭据，也不会调用未文档化的 API。`refreshCommand` 只会在你显式执行 `quota refresh` 时运行。

`language` 只影响 HUD 标签和命令行提示，不会翻译模型名、分支名、工具名或 token 单位。

切换布尔开关：

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure toggle display.showCredits
```

应用预设：

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure preset minimal
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure preset default
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js configure preset full
```

常用显示开关：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `display.showContext` | `true` | 显示上下文占用行 |
| `display.showTokens` | `true` | 显示输入/输出 token 总量 |
| `display.showCache` | `true` | 显示 prompt/cache token |
| `display.showCost` | `false` | 显示 CodeBuddy 提供的 USD 成本 |
| `display.showCredits` | `false` | 显示 transcript 中累计的 credits |
| `display.showTools` | `true` | 显示工具调用统计 |
| `display.showAgents` | `true` | 显示 Agent 数量 |
| `display.showTasks` | `true` | 显示任务进度 |
| `colors.enabled` | `true` | 是否启用 ANSI 颜色 |

## 上下文阈值

```json
{
  "thresholds": {
    "contextWarning": 70,
    "contextDanger": 90
  }
}
```

上下文进度条会根据阈值显示正常、警告、危险颜色。

## 工作原理

```text
CodeBuddy Code
  -> 通过 stdin 传入 statusLine JSON
  -> codebuddy-hud status
  -> 可选解析 transcript JSONL
  -> 查询 git 状态
  -> 输出 ANSI 多行 HUD
```

设计原则：

- transcript 解析失败不会影响基础 HUD 渲染。
- 没有 transcript 时会自动退化为 stdin-only 显示。
- 不依赖外部生产 npm 包。
- 本地运行状态不会提交到 git：`.cache.json`、`.meta.json`、`config.json` 都会被忽略。

## 验证部署

使用测试 fixture：

```bash
npm run build
npm test
npm run test:stdin
```

使用真实 CodeBuddy statusLine JSON：

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js status < ~/.codebuddy/statusline-last-input.json
```

查看 CodeBuddy 实际传入字段：

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js inspect < ~/.codebuddy/statusline-last-input.json
```

## 回滚

自动回滚到安装前的 `statusLine`：

```bash
node ~/.codebuddy/plugins/codebuddy-hud/bin/codebuddy-hud.js uninstall
```

手动回滚示例：

```json
{
  "statusLine": {
    "type": "command",
    "command": "/bin/sh /Users/you/.codebuddy/statusline-ys.sh"
  }
}
```

## 致谢

本项目受到 `jarrodwatts/claude-hud` 的终端 HUD 思路和仓库组织风格启发，但这是一个独立的 CodeBuddy Code 实现。

## License

Apache-2.0. See [LICENSE](LICENSE).
