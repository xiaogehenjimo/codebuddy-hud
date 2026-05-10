const test = require('node:test');
const assert = require('node:assert/strict');
const { render, contextStats, formatTokens, formatDuration } = require('../src/render');
const { defaultConfig } = require('../src/config');

test('formats token units with uppercase K and M', () => {
  assert.equal(formatTokens(91700), '91.7K');
  assert.equal(formatTokens(1000000), '1M');
  assert.equal(formatTokens(5800000), '5.8M');
});

test('computes context from current usage first', () => {
  const stats = contextStats({
    context_window: {
      total_input_tokens: 700000,
      total_output_tokens: 20000,
      context_window_size: 1000000,
      current_usage: { input_tokens: 91000, output_tokens: 700 },
      used_percentage: 9.17
    }
  });
  assert.equal(stats.used, 91700);
  assert.equal(stats.limit, 1000000);
  assert.equal(stats.pct, 9.17);
});

test('renders multiline HUD without credits by default', () => {
  const output = render({
    cwd: process.cwd(),
    model: { display_name: 'GPT-5.5' },
    workspace: { project_dir: process.cwd(), current_dir: process.cwd() },
    cost: { total_duration_ms: 60000, total_api_duration_ms: 30000, total_lines_added: 1, total_lines_removed: 2 },
    context_window: {
      total_input_tokens: 91700,
      total_output_tokens: 1000,
      context_window_size: 1000000,
      used_percentage: 9.17,
      current_usage: { input_tokens: 91000, output_tokens: 700, cache_read_input_tokens: 5800000 }
    }
  }, { ...defaultConfig, colors: { enabled: false } }, { creditTotal: 123, toolCounts: { Read: 1 }, agentCount: 0, tasks: { total: 1, completed: 1 } });

  assert.match(output, /CodeBuddy/);
  assert.match(output, /91\.7K\/1M/);
  assert.match(output, /cache 5\.8M/);
  assert.doesNotMatch(output, /credits/);
  assert.equal(output.split('\n').length, 4);
});

test('formats durations compactly', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(61000), '1m1s');
  assert.equal(formatDuration(3661000), '1h1m');
});
