# CodeBuddy statusLine integration

CodeBuddy HUD is designed to be used as a CodeBuddy Code `statusLine.command`.

## Expected setup

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/codebuddy-hud/bin/codebuddy-hud.js status"
  }
}
```

## Input fields

CodeBuddy passes JSON on stdin. The HUD uses these fields when available:

```text
model.id
model.display_name
cwd
workspace.current_dir
workspace.project_dir
transcript_path
session_id
cost.total_duration_ms
cost.total_api_duration_ms
cost.total_lines_added
cost.total_lines_removed
cost.total_cost_usd
context_window.context_window_size
context_window.total_input_tokens
context_window.total_output_tokens
context_window.current_usage.input_tokens
context_window.current_usage.output_tokens
context_window.current_usage.cache_creation_input_tokens
context_window.current_usage.cache_read_input_tokens
context_window.used_percentage
context_window.remaining_percentage
exceeds_200k_tokens
```

## Transcript parsing

When `transcript_path` exists, CodeBuddy HUD parses JSONL events for:

- `function_call.name` tool counts
- `Agent` call counts
- `TaskCreate` / `TaskUpdate` progress
- `providerData.rawUsage.credit` when `display.showCredits` is enabled

Parsing failures do not block HUD rendering.
