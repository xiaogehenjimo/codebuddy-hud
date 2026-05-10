const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  extractOfficialQuota,
  readSnapshotQuota,
  estimateLocalQuota,
  resolveQuota
} = require('../src/quota');

const fixturePath = path.join(__dirname, 'fixtures', 'quota-snapshot.json');

test('extracts official quota fields with plan and reset metadata', () => {
  assert.deepEqual(extractOfficialQuota({
    billing: {
      remainingCredits: 80,
      totalCredits: 100,
      addonCredits: 20,
      planType: 'Pro',
      resetAt: '2026-06-01T00:00:00Z'
    }
  }), {
    remaining: 80,
    total: 100,
    used: 20,
    addon: 20,
    plan: 'Pro',
    resetAt: '2026-06-01T00:00:00Z',
    updatedAt: undefined,
    ageMs: undefined,
    stale: false,
    source: 'official'
  });
});

test('computes official remaining from used and total', () => {
  const quota = extractOfficialQuota({ quota: { usedCredits: 25, totalCredits: 100 } });
  assert.equal(quota.remaining, 75);
  assert.equal(quota.used, 25);
  assert.equal(quota.source, 'official');
});

test('reads snapshot quota fixture', () => {
  const quota = readSnapshotQuota({ credits: { snapshotPath: fixturePath, maxStalenessMs: 3600000 } });
  assert.equal(quota.remaining, 72);
  assert.equal(quota.total, 100);
  assert.equal(quota.used, 28);
  assert.equal(quota.addon, 10);
  assert.equal(quota.plan, 'Pro');
  assert.equal(quota.source, 'snapshot');
  assert.equal(quota.stale, false);
});

test('marks snapshots stale by updatedAt', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codebuddy-hud-quota-'));
  const snapshotPath = path.join(dir, 'quota.json');
  fs.writeFileSync(snapshotPath, JSON.stringify({
    quota: {
      remaining: 10,
      used: 90,
      total: 100,
      updatedAt: '2000-01-01T00:00:00Z'
    }
  }));

  const stale = readSnapshotQuota({ credits: { snapshotPath, maxStalenessMs: 1 } });
  assert.equal(stale.stale, true);
});

test('estimates local quota only when enabled', () => {
  assert.equal(estimateLocalQuota({ credits: { enabled: false, totalCredits: 100 } }, { creditTotal: 10 }), null);
  assert.deepEqual(estimateLocalQuota({ credits: { enabled: true, totalCredits: 100, usedCreditsOffset: 15 } }, { creditTotal: 10 }), {
    remaining: 75,
    total: 100,
    used: 25,
    source: 'local'
  });
});

test('resolves quota by official then snapshot then local priority', () => {
  const config = { credits: { enabled: true, totalCredits: 999, usedCreditsOffset: 0, snapshotPath: fixturePath } };
  assert.equal(resolveQuota({ credits: { remainingCredits: 1, totalCredits: 2 } }, config, { creditTotal: 10 }).source, 'official');
  assert.equal(resolveQuota({}, config, { creditTotal: 10 }).source, 'snapshot');
  assert.equal(resolveQuota({}, { credits: { enabled: true, totalCredits: 100, usedCreditsOffset: 0 } }, { creditTotal: 10 }).source, 'local');
});
