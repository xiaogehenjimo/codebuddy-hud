const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const bin = path.join(root, 'bin', 'codebuddy-hud.js');

function tempEnv() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codebuddy-hud-'));
  return {
    dir,
    env: {
      ...process.env,
      CODEBUDDY_HUD_CONFIG: path.join(dir, 'config.json'),
      CODEBUDDY_HUD_CACHE: path.join(dir, '.cache.json'),
      CODEBUDDY_HUD_META: path.join(dir, '.meta.json'),
      CODEBUDDY_SETTINGS_PATH: path.join(dir, 'settings.json')
    }
  };
}

function run(args, options = {}) {
  return spawnSync(process.execPath, [bin, ...args], {
    cwd: root,
    encoding: 'utf8',
    input: options.input,
    env: options.env || process.env
  });
}

function stripAnsi(value) {
  return value.replace(/\x1B\[[0-9;]*m/g, '');
}

test('configure get/set/toggle works with isolated config', () => {
  const { env } = tempEnv();

  let result = run(['configure', 'get', 'display.showCredits'], { env });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'false');

  result = run(['configure', 'toggle', 'display.showCredits'], { env });
  assert.equal(result.status, 0, result.stderr);

  result = run(['configure', 'get', 'display.showCredits'], { env });
  assert.equal(result.stdout.trim(), 'true');

  result = run(['configure', 'set', 'barWidth', '20'], { env });
  assert.equal(result.status, 0, result.stderr);

  result = run(['configure', 'get', 'barWidth'], { env });
  assert.equal(result.stdout.trim(), '20');

  result = run(['configure', 'set', 'language', 'en'], { env });
  assert.equal(result.status, 0, result.stderr);

  result = run(['configure', 'get', 'language'], { env });
  assert.equal(result.stdout.trim(), '"en"');

  result = run(['configure', 'set', 'credits.enabled', 'true'], { env });
  assert.equal(result.status, 0, result.stderr);

  result = run(['configure', 'set', 'credits.totalCredits', '500'], { env });
  assert.equal(result.status, 0, result.stderr);

  result = run(['configure', 'set', 'credits.usedCreditsOffset', '100'], { env });
  assert.equal(result.status, 0, result.stderr);

  result = run(['configure', 'set', 'credits.snapshotPath', '/tmp/quota.json'], { env });
  assert.equal(result.status, 0, result.stderr);

  result = run(['configure', 'get', 'credits.totalCredits'], { env });
  assert.equal(result.stdout.trim(), '500');

  result = run(['configure', 'get', 'credits.snapshotPath'], { env });
  assert.equal(result.stdout.trim(), '"/tmp/quota.json"');
});

test('quota status and refresh use explicit configured command', () => {
  const { dir, env } = tempEnv();
  const snapshotPath = path.join(dir, 'quota.json');

  let result = run(['quota', 'refresh'], { env });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refreshCommand|未配置/);

  result = run(['quota', 'status'], { env });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /没有有效的配额快照|no valid quota snapshot/);

  const refreshScript = `require('fs').writeFileSync(${JSON.stringify(snapshotPath)}, JSON.stringify({quota:{remaining:9,total:10,used:1,plan:'Pro',updatedAt:new Date().toISOString()}}))`;
  result = run(['configure', 'set', 'credits.snapshotPath', snapshotPath], { env });
  assert.equal(result.status, 0, result.stderr);
  result = run(['configure', 'set', 'credits.refreshCommand', `${process.execPath} -e ${JSON.stringify(refreshScript)}`], { env });
  assert.equal(result.status, 0, result.stderr);

  result = run(['quota', 'refresh'], { env });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /9\/10/);

  result = run(['quota', 'status'], { env });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /9\/10/);
});

test('status command does not execute refreshCommand', () => {
  const { dir, env } = tempEnv();
  const markerPath = path.join(dir, 'marker');
  const refreshScript = `require('fs').writeFileSync(${JSON.stringify(markerPath)}, 'ran')`;

  let result = run(['configure', 'set', 'credits.refreshCommand', `${process.execPath} -e ${JSON.stringify(refreshScript)}`], { env });
  assert.equal(result.status, 0, result.stderr);

  result = run(['status'], { env, input: '{"model":{"display_name":"GPT-5.5"}}' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(markerPath), false);
});

test('setup and uninstall preserve previous statusLine', () => {
  const { dir, env } = tempEnv();
  const settingsPath = path.join(dir, 'settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify({ statusLine: { type: 'command', command: 'old-command' } }));

  let result = run(['setup'], { env });
  assert.equal(result.status, 0, result.stderr);
  let settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.match(settings.statusLine.command, /codebuddy-hud\.js status/);

  result = run(['uninstall'], { env });
  assert.equal(result.status, 0, result.stderr);
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.equal(settings.statusLine.command, 'old-command');
});

test('status command renders fixture JSON', () => {
  const { env } = tempEnv();
  const input = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'status.json'), 'utf8');
  const result = run(['status'], { env, input });

  assert.equal(result.status, 0, result.stderr);
  const stdout = stripAnsi(result.stdout);
  assert.match(stdout, /CodeBuddy/);
  assert.match(stdout, /91\.7K\/1M/);
  assert.match(stdout, /缓存 5\.8M/);
  assert.match(stdout, /变更 \+168 -1/);
  assert.doesNotMatch(stdout, /积分/);
});

test('CLI help and inspect use configured English language', () => {
  const { env } = tempEnv();

  let result = run(['configure', 'set', 'language', 'en'], { env });
  assert.equal(result.status, 0, result.stderr);

  result = run(['configure', 'help'], { env });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Config file:/);
  assert.match(result.stdout, /Examples:/);

  result = run(['inspect'], { env, input: '{"foo":{"bar":1}}' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /top-level keys:/);
  assert.match(result.stdout, /paths:/);
});
