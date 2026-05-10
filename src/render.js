const path = require('path');
const { getGitInfo } = require('./git');
const { createTranslator } = require('./i18n');
const { extractOfficialQuota, resolveQuota } = require('./quota');

const ANSI = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  white: '\x1b[97m'
};

function hexColor(value) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(value || ''));
  if (!match) return '';
  const hex = match[1];
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return `\x1b[38;2;${red};${green};${blue}m`;
}

function color(config, name, text) {
  if (!config.colors || config.colors.enabled === false) return text;
  const names = Array.isArray(name) ? name.flat(Infinity) : [name];
  const prefix = names.map((part) => ANSI[part] || hexColor(part)).join('');
  return `${prefix}${text}${ANSI.reset}`;
}

function muted(config, text) {
  return color(config, 'gray', text);
}

function label(config, text, hue = 'brightCyan') {
  return color(config, ['bold', hue], text);
}

function joinParts(config, parts) {
  return parts.filter(Boolean).join(muted(config, ' · '));
}

function num(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/[,_ %]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function firstNumber(...values) {
  for (const value of values) {
    const parsed = num(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function trim(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function formatTokens(value) {
  const n = num(value);
  if (n === null) return '0';
  if (Math.abs(n) >= 1000000) return `${trim(n / 1000000)}M`;
  if (Math.abs(n) >= 1000) return `${trim(n / 1000)}K`;
  return String(Math.floor(n));
}

function formatPercent(value) {
  const n = num(value);
  if (n === null) return '0%';
  return `${trim(n)}%`;
}

function formatDuration(ms) {
  const n = num(ms);
  if (!n || n < 0) return '0s';
  const totalSeconds = Math.floor(n / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours) return `${hours}h${minutes}m`;
  if (minutes) return `${minutes}m${seconds}s`;
  return `${seconds}s`;
}

function basename(cwd) {
  if (!cwd) return '?';
  return path.basename(cwd) || cwd;
}

function ellipsize(value, max) {
  const text = String(value || '');
  if (!max || text.length <= max) return text;
  if (max <= 1) return text.slice(0, max);
  return `${text.slice(0, max - 1)}…`;
}

function workspaceName(status, cwd) {
  const workspace = status.workspace || {};
  const projectDir = workspace.project_dir || cwd;
  const currentDir = workspace.current_dir || cwd;
  const project = basename(projectDir);

  if (!projectDir || !currentDir) return ellipsize(project || basename(cwd), 28);

  const relative = path.relative(projectDir, currentDir);
  if (!relative || relative === '.') return ellipsize(project, 28);
  if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
    return ellipsize(`${project}/${relative}`, 36);
  }
  return ellipsize(basename(currentDir), 28);
}

function progressBar(config, percent, width, hue) {
  const safe = Math.max(0, Math.min(100, num(percent) || 0));
  const size = Math.max(4, Math.min(30, num(width) || 14));
  const filled = Math.round((safe / 100) * size);
  const empty = Math.max(0, size - filled);
  return `${color(config, hue, '█'.repeat(filled))}${muted(config, '░'.repeat(empty))}`;
}

function contextStats(status) {
  const cw = status.context_window || {};
  const current = cw.current_usage || {};
  const currentUsed = firstNumber(
    current.input_tokens !== undefined || current.output_tokens !== undefined
      ? (num(current.input_tokens) || 0) + (num(current.output_tokens) || 0)
      : null
  );
  const totalUsed = firstNumber(
    cw.total_input_tokens !== undefined || cw.total_output_tokens !== undefined
      ? (num(cw.total_input_tokens) || 0) + (num(cw.total_output_tokens) || 0)
      : null
  );
  const used = firstNumber(currentUsed, totalUsed);
  const limit = firstNumber(cw.context_window_size);
  const remainingPct = num(cw.remaining_percentage);
  const pct = firstNumber(
    cw.used_percentage,
    remainingPct !== null ? 100 - remainingPct : null,
    used !== null && limit ? (used / limit) * 100 : null
  );
  const cache = firstNumber(current.cache_read_input_tokens, current.cache_creation_input_tokens);

  return {
    used: used || 0,
    totalInput: num(cw.total_input_tokens) || 0,
    totalOutput: num(cw.total_output_tokens) || 0,
    limit: limit || 0,
    pct: pct || 0,
    cache: cache || 0
  };
}

function pctColor(config, pct) {
  const value = num(pct) || 0;
  if (value >= 95) return ['bold', '#991B1B'];
  if (value >= 88) return '#EF4444';
  if (value >= 80) return '#F87171';
  if (value >= 70) return '#F97316';
  if (value >= 60) return '#F59E0B';
  if (value >= 45) return '#EAB308';
  if (value >= 30) return '#A3E635';
  return '#22C55E';
}

function formatGit(git, t) {
  if (!git || !git.branch) return '';
  const dirty = git.dirty ? '*' : '';
  const ahead = git.ahead ? `↑${git.ahead}` : '';
  const behind = git.behind ? `↓${git.behind}` : '';
  const suffix = [dirty, ahead, behind].filter(Boolean).join(' ');
  return `${t('hud.git')} ${ellipsize(git.branch, 24)}${suffix ? ` ${suffix}` : ''}`;
}

function stat(config, key, value, hue = 'cyan') {
  return `${color(config, hue, key)} ${value}`;
}

function officialCreditEstimate(status) {
  return extractOfficialQuota(status);
}

function creditEstimate(status, config, transcriptSummary) {
  return resolveQuota(status, config, transcriptSummary);
}

function quotaColor(config, quota) {
  const credits = config.credits || {};
  const pct = quota && quota.total > 0 ? (quota.remaining / quota.total) * 100 : 0;
  if (pct <= (num(credits.dangerRemainingPercent) ?? 10)) return 'brightRed';
  if (pct <= (num(credits.warningRemainingPercent) ?? 25)) return 'brightYellow';
  return 'brightBlue';
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatAge(ms) {
  const n = num(ms);
  if (n === null) return '';
  const seconds = Math.floor(n / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function quotaSegment(config, t, quota) {
  if (!quota) return null;
  const creditsConfig = config.credits || {};
  const hue = quotaColor(config, quota);
  const pct = quota.total > 0 ? (quota.remaining / quota.total) * 100 : 0;
  const parts = [];

  if (creditsConfig.showBar !== false) {
    parts.push(progressBar(config, pct, creditsConfig.barWidth || 6, hue));
  }

  parts.push(`${trim(quota.remaining)}/${trim(quota.total)}`);
  parts.push(`${t('hud.used')} ${trim(quota.used)}`);

  if (quota.addon !== undefined) parts.push(`${t('hud.addon')} ${trim(quota.addon)}`);
  if (quota.plan) parts.push(String(quota.plan));
  if (creditsConfig.showReset !== false && quota.resetAt) parts.push(`${t('hud.reset')} ${formatDate(quota.resetAt)}`);
  if (creditsConfig.showSource !== false && quota.source) parts.push(t(`hud.source.${quota.source}`));
  if (creditsConfig.showStaleness !== false && quota.stale) parts.push(t('hud.stale'));
  else if (creditsConfig.showStaleness !== false && quota.source === 'snapshot' && quota.ageMs !== undefined) parts.push(`${t('hud.updated')} ${formatAge(quota.ageMs)}`);

  return stat(config, t('hud.credits'), parts.join(' '), hue);
}

function render(status, config, transcriptSummary = {}) {
  const safeStatus = status || {};
  const safeConfig = config || {};
  const display = safeConfig.display || {};
  const t = createTranslator(safeConfig);
  const cwd = safeStatus.cwd || (safeStatus.workspace && safeStatus.workspace.current_dir) || process.cwd();
  const model = (safeStatus.model && (safeStatus.model.display_name || safeStatus.model.id)) || t('hud.title');
  const work = workspaceName(safeStatus, cwd);
  const git = display.showGit ? getGitInfo(cwd) : null;
  const gitText = formatGit(git, t);
  const ctx = contextStats(safeStatus);
  const ctxColor = pctColor(safeConfig, ctx.pct);
  const cost = safeStatus.cost || {};
  const parts = [];

  const headerParts = [
    color(safeConfig, ['bold', 'white'], t('hud.title')),
    display.showModel ? color(safeConfig, 'brightCyan', ellipsize(model, 28)) : null,
    display.showProject ? color(safeConfig, 'brightMagenta', work) : null,
    gitText ? color(safeConfig, git && git.dirty ? 'brightYellow' : 'brightGreen', gitText) : null
  ];
  parts.push(joinParts(safeConfig, headerParts));

  if (display.showContext) {
    const width = safeConfig.barWidth || 16;
    const contextBar = progressBar(safeConfig, ctx.pct, width, ctxColor);
    const tokens = ctx.limit ? `${formatTokens(ctx.used)}/${formatTokens(ctx.limit)}` : formatTokens(ctx.used);
    const contextLine = joinParts(safeConfig, [
      `${label(safeConfig, t('hud.ctx'), 'brightMagenta')} ${contextBar} ${color(safeConfig, ['bold', ctxColor], formatPercent(ctx.pct))}`,
      stat(safeConfig, t('hud.tok'), tokens, 'cyan'),
      display.showCache && ctx.cache ? stat(safeConfig, t('hud.cache'), formatTokens(ctx.cache), 'blue') : null
    ]);
    parts.push(contextLine);
  }

  const credits = display.showCredits === true ? creditEstimate(safeStatus, safeConfig, transcriptSummary) : null;
  if (display.showTokens || display.showLinesChanged || display.showCost || credits) {
    const statParts = [];
    if (display.showTokens) {
      statParts.push(stat(safeConfig, t('hud.in'), formatTokens(ctx.totalInput), 'green'));
      statParts.push(stat(safeConfig, t('hud.out'), formatTokens(ctx.totalOutput), 'green'));
    }
    if (display.showLinesChanged) {
      statParts.push(stat(safeConfig, t('hud.changes'), `+${num(cost.total_lines_added) || 0} -${num(cost.total_lines_removed) || 0}`, 'magenta'));
    }
    if (credits) {
      statParts.push(quotaSegment(safeConfig, t, credits));
    }
    if (display.showCost && Number.isFinite(num(cost.total_cost_usd))) {
      statParts.push(stat(safeConfig, '$', Number(cost.total_cost_usd).toFixed(4), 'brightYellow'));
    }
    parts.push(`${label(safeConfig, t('hud.tok'), 'brightBlue')} ${joinParts(safeConfig, statParts)}`);
  }

  const maxLines = num(safeConfig.maxLines);
  const visibleParts = maxLines && maxLines > 0 ? parts.slice(0, Math.floor(maxLines)) : parts;
  return visibleParts.join('\n');
}

module.exports = { render, contextStats, creditEstimate, officialCreditEstimate, quotaSegment, formatTokens, formatDuration, pctColor };
