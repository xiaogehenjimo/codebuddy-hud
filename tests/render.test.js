const test = require('node:test');
const assert = require('node:assert/strict');
const { render, contextStats, creditEstimate, officialCreditEstimate, formatTokens, formatDuration } = require('../src/render');
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
  }, { ...defaultConfig, language: 'en', colors: { enabled: false } }, { creditTotal: 123, toolCounts: { Read: 1 }, agentCount: 0, tasks: { total: 1, completed: 1 } });

  assert.match(output, /CodeBuddy/);
  assert.match(output, /91\.7K\/1M/);
  assert.match(output, /cache 5\.8M/);
  assert.doesNotMatch(output, /credits/);
  assert.equal(output.split('\n').length, 4);
});

test('renders Chinese HUD labels when language is zh', () => {
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
  }, { ...defaultConfig, language: 'zh', colors: { enabled: false } }, { toolCounts: {}, agentCount: 0, tasks: { total: 0, completed: 0 } });

  assert.match(output, /上下文/);
  assert.match(output, /词元/);
  assert.doesNotMatch(output, /令牌/);
  assert.match(output, /缓存 5\.8M/);
  assert.match(output, /工具 空闲/);
  assert.match(output, /任务/);
});

test('estimates remaining credits from transcript total and offset', () => {
  assert.deepEqual(creditEstimate({}, { credits: { enabled: true, totalCredits: 500, usedCreditsOffset: 100 } }, { creditTotal: 86.5 }), {
    remaining: 313.5,
    total: 500,
    used: 186.5,
    source: 'local'
  });
});

test('hides credit estimate when disabled or total is zero', () => {
  assert.equal(creditEstimate({}, { credits: { enabled: false, totalCredits: 500 } }, { creditTotal: 1 }), null);
  assert.equal(creditEstimate({}, { credits: { enabled: true, totalCredits: 0 } }, { creditTotal: 1 }), null);
});

test('reads official snake_case credit fields before local estimate', () => {
  const quota = creditEstimate({ credits: { remaining_credits: 350, total_credits: 500 } }, { credits: { enabled: true, totalCredits: 999 } }, { creditTotal: 1 });
  assert.equal(quota.remaining, 350);
  assert.equal(quota.total, 500);
  assert.equal(quota.used, 150);
  assert.equal(quota.source, 'official');
});

test('reads official camelCase billing fields', () => {
  const quota = officialCreditEstimate({ billing: { remainingCredits: 120, totalCredits: 200 } });
  assert.equal(quota.remaining, 120);
  assert.equal(quota.total, 200);
  assert.equal(quota.used, 80);
  assert.equal(quota.source, 'official');
});

test('computes official remaining from used and total fields', () => {
  const quota = officialCreditEstimate({ quota: { usedCredits: 75, totalCredits: 100 } });
  assert.equal(quota.remaining, 25);
  assert.equal(quota.total, 100);
  assert.equal(quota.used, 75);
  assert.equal(quota.source, 'official');
});

test('falls back to local estimate when official total is missing', () => {
  assert.deepEqual(creditEstimate({ credits: { remaining_credits: 350 } }, { credits: { enabled: true, totalCredits: 500, usedCreditsOffset: 100 } }, { creditTotal: 50 }), {
    remaining: 350,
    total: 500,
    used: 150,
    source: 'local'
  });
});

test('renders official credits even when local credits are disabled', () => {
  const output = render({
    cwd: process.cwd(),
    model: { display_name: 'GPT-5.5' },
    workspace: { project_dir: process.cwd(), current_dir: process.cwd() },
    cost: {},
    context_window: {},
    billing: { remainingCredits: 88, totalCredits: 100 }
  }, { ...defaultConfig, language: 'en', colors: { enabled: false }, credits: { enabled: false, totalCredits: 0 } }, { toolCounts: {}, agentCount: 0, tasks: { total: 0, completed: 0 } });

  assert.match(output, /credits .*88\/100/);
  assert.equal(output.split('\n')[3].includes('credits'), true);
});

test('renders estimated credits in English and clamps remaining at zero', () => {
  const status = {
    cwd: process.cwd(),
    model: { display_name: 'GPT-5.5' },
    workspace: { project_dir: process.cwd(), current_dir: process.cwd() },
    cost: {},
    context_window: {}
  };
  const output = render(status, {
    ...defaultConfig,
    language: 'en',
    colors: { enabled: false },
    credits: { enabled: true, totalCredits: 100, usedCreditsOffset: 80 }
  }, { creditTotal: 50, toolCounts: {}, agentCount: 0, tasks: { total: 0, completed: 0 } });

  assert.match(output, /credits .*0\/100/);
});

test('renders estimated credits in Chinese', () => {
  const status = {
    cwd: process.cwd(),
    model: { display_name: 'GPT-5.5' },
    workspace: { project_dir: process.cwd(), current_dir: process.cwd() },
    cost: {},
    context_window: {}
  };
  const output = render(status, {
    ...defaultConfig,
    language: 'zh',
    colors: { enabled: false },
    credits: { enabled: true, totalCredits: 500, usedCreditsOffset: 100 }
  }, { creditTotal: 86.5, toolCounts: {}, agentCount: 0, tasks: { total: 0, completed: 0 } });

  assert.match(output, /积分 .*313\.5\/500/);
  assert.equal(output.split('\n')[3].includes('积分'), true);
});

test('formats durations compactly', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(61000), '1m1s');
  assert.equal(formatDuration(3661000), '1h1m');
});
