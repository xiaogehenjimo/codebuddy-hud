const fs = require('fs');

function num(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/[,_ %]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getPath(object, pathParts) {
  return pathParts.reduce((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return value[key];
  }, object);
}

function firstPathValue(object, paths) {
  for (const pathParts of paths) {
    const value = getPath(object, pathParts);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function firstPathNumber(object, paths) {
  const value = firstPathValue(object, paths);
  return num(value);
}

const REMAINING_PATHS = [
  ['remaining_credits'], ['remainingCredits'], ['remaining'], ['balance_credits'], ['balanceCredits'], ['balance'],
  ['credits', 'remaining_credits'], ['credits', 'remainingCredits'], ['credits', 'remaining'], ['credits', 'balance_credits'], ['credits', 'balanceCredits'], ['credits', 'balance'],
  ['billing', 'remaining_credits'], ['billing', 'remainingCredits'], ['billing', 'remaining'], ['billing', 'balance_credits'], ['billing', 'balanceCredits'], ['billing', 'balance'],
  ['plan', 'remaining_credits'], ['plan', 'remainingCredits'], ['plan', 'remaining'],
  ['quota', 'remaining_credits'], ['quota', 'remainingCredits'], ['quota', 'remaining']
];

const TOTAL_PATHS = [
  ['total_credits'], ['totalCredits'], ['total'], ['quota_total'], ['quotaTotal'],
  ['credits', 'total_credits'], ['credits', 'totalCredits'], ['credits', 'total'],
  ['billing', 'total_credits'], ['billing', 'totalCredits'], ['billing', 'total'],
  ['plan', 'total_credits'], ['plan', 'totalCredits'], ['plan', 'total'],
  ['quota', 'total_credits'], ['quota', 'totalCredits'], ['quota', 'total']
];

const USED_PATHS = [
  ['used_credits'], ['usedCredits'], ['used'], ['usage_credits'], ['usageCredits'],
  ['credits', 'used_credits'], ['credits', 'usedCredits'], ['credits', 'used'],
  ['billing', 'used_credits'], ['billing', 'usedCredits'], ['billing', 'used'],
  ['plan', 'used_credits'], ['plan', 'usedCredits'], ['plan', 'used'],
  ['quota', 'used_credits'], ['quota', 'usedCredits'], ['quota', 'used']
];

const ADDON_PATHS = [
  ['addon_credits'], ['addonCredits'], ['addon'], ['add_on_credits'], ['addOnCredits'],
  ['credits', 'addon_credits'], ['credits', 'addonCredits'], ['credits', 'addon'],
  ['billing', 'addon_credits'], ['billing', 'addonCredits'], ['billing', 'addon'],
  ['plan', 'addon_credits'], ['plan', 'addonCredits'], ['plan', 'addon'],
  ['quota', 'addon_credits'], ['quota', 'addonCredits'], ['quota', 'addon']
];

const PLAN_PATHS = [
  ['plan_type'], ['planType'], ['package_name'], ['packageName'], ['tier'],
  ['credits', 'plan_type'], ['credits', 'planType'], ['credits', 'package_name'], ['credits', 'packageName'], ['credits', 'tier'], ['credits', 'plan'],
  ['billing', 'plan_type'], ['billing', 'planType'], ['billing', 'package_name'], ['billing', 'packageName'], ['billing', 'tier'], ['billing', 'plan'],
  ['plan', 'name'], ['plan', 'type'], ['plan', 'tier'], ['plan', 'planType'], ['plan', 'packageName'],
  ['quota', 'plan_type'], ['quota', 'planType'], ['quota', 'package_name'], ['quota', 'packageName'], ['quota', 'tier'], ['quota', 'plan'],
  ['plan']
];

const RESET_PATHS = [
  ['reset_at'], ['resetAt'], ['reset_date'], ['resetDate'], ['resets_at'], ['resetsAt'], ['reset_time'], ['resetTime'],
  ['credits', 'reset_at'], ['credits', 'resetAt'], ['credits', 'reset_date'], ['credits', 'resetDate'], ['credits', 'resetsAt'],
  ['billing', 'reset_at'], ['billing', 'resetAt'], ['billing', 'reset_date'], ['billing', 'resetDate'], ['billing', 'resetsAt'],
  ['plan', 'reset_at'], ['plan', 'resetAt'], ['plan', 'reset_date'], ['plan', 'resetDate'], ['plan', 'resetsAt'],
  ['quota', 'reset_at'], ['quota', 'resetAt'], ['quota', 'reset_date'], ['quota', 'resetDate'], ['quota', 'resetsAt']
];

const UPDATED_PATHS = [
  ['updated_at'], ['updatedAt'], ['last_refreshed'], ['lastRefreshed'], ['refreshed_at'], ['refreshedAt'],
  ['credits', 'updated_at'], ['credits', 'updatedAt'], ['credits', 'lastRefreshed'],
  ['billing', 'updated_at'], ['billing', 'updatedAt'], ['billing', 'lastRefreshed'],
  ['quota', 'updated_at'], ['quota', 'updatedAt'], ['quota', 'lastRefreshed']
];

function normalizeQuota(raw, source, options = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const total = firstPathNumber(raw, TOTAL_PATHS);
  if (total === null || total <= 0) return null;

  const remainingValue = firstPathNumber(raw, REMAINING_PATHS);
  const usedValue = firstPathNumber(raw, USED_PATHS);

  let remaining;
  let used;
  if (remainingValue !== null) {
    remaining = Math.max(0, remainingValue);
    used = Math.max(0, total - remaining);
  } else if (usedValue !== null) {
    used = Math.max(0, usedValue);
    remaining = Math.max(0, total - used);
  } else {
    return null;
  }

  const addon = firstPathNumber(raw, ADDON_PATHS);
  const planValue = firstPathValue(raw, PLAN_PATHS);
  const plan = planValue && typeof planValue !== 'object' ? planValue : undefined;
  const resetAt = firstPathValue(raw, RESET_PATHS);
  const updatedAt = firstPathValue(raw, UPDATED_PATHS) || options.updatedAt;
  const ageMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : options.ageMs;
  const maxStalenessMs = options.maxStalenessMs || 0;

  return {
    remaining,
    total,
    used,
    addon: addon === null ? undefined : addon,
    plan: plan === undefined ? undefined : String(plan),
    resetAt: resetAt === undefined ? undefined : String(resetAt),
    updatedAt: updatedAt === undefined ? undefined : String(updatedAt),
    ageMs: Number.isFinite(ageMs) && ageMs >= 0 ? ageMs : undefined,
    stale: Boolean(maxStalenessMs > 0 && Number.isFinite(ageMs) && ageMs > maxStalenessMs),
    source
  };
}

function extractOfficialQuota(status) {
  return normalizeQuota(status || {}, 'official');
}

function readSnapshotQuota(config) {
  const credits = config.credits || {};
  if (!credits.snapshotPath) return null;

  let stat;
  let parsed;
  try {
    stat = fs.statSync(credits.snapshotPath);
    parsed = JSON.parse(fs.readFileSync(credits.snapshotPath, 'utf8'));
  } catch {
    return null;
  }

  return normalizeQuota(parsed, 'snapshot', {
    updatedAt: stat.mtime.toISOString(),
    ageMs: Date.now() - stat.mtimeMs,
    maxStalenessMs: num(credits.maxStalenessMs) || 0
  });
}

function estimateLocalQuota(config, transcriptSummary) {
  const credits = config.credits || {};
  const enabled = Boolean(credits.enabled || (config.display && config.display.showCredits));
  const total = Math.max(0, num(credits.totalCredits) || 0);
  if (!enabled || total <= 0) return null;

  const offset = num(credits.usedCreditsOffset) || 0;
  const transcriptUsed = num(transcriptSummary && transcriptSummary.creditTotal) || 0;
  const used = Math.max(0, transcriptUsed + offset);
  const remaining = Math.max(0, total - used);

  return { remaining, total, used, source: 'local' };
}

function resolveQuota(status, config, transcriptSummary) {
  return extractOfficialQuota(status) || readSnapshotQuota(config || {}) || estimateLocalQuota(config || {}, transcriptSummary || {});
}

function validateSnapshotQuota(config) {
  const quota = readSnapshotQuota(config || {});
  return quota ? { ok: true, quota } : { ok: false };
}

module.exports = {
  extractOfficialQuota,
  readSnapshotQuota,
  validateSnapshotQuota,
  estimateLocalQuota,
  resolveQuota,
  normalizeQuota,
  firstPathNumber,
  num
};
