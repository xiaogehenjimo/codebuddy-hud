const path = require('path');
const { getGitInfo } = require('./git');
const { createTranslator } = require('./i18n');

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

function color(config, name, text) {
  if (!config.colors || config.colors.enabled === false) return text;
  const names = Array.isArray(name) ? name : [name];
  const prefix = names.map((part) => ANSI[part] || '').join('');
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
  const thresholds = config.thresholds || {};
  if (pct >= (thresholds.contextDanger || 90)) return 'brightRed';
  if (pct >= (thresholds.contextWarning || 70)) return 'brightYellow';
  return 'brightGreen';
}

function formatGit(git, t) {
  if (!git || !git.branch) return '';
  const dirty = git.dirty ? '*' : '';
  const ahead = git.ahead ? `↑${git.ahead}` : '';
  const behind = git.behind ? `↓${git.behind}` : '';
  const suffix = [dirty, ahead, behind].filter(Boolean).join(' ');
  return `${t('hud.git')} ${ellipsize(git.branch, 24)}${suffix ? ` ${suffix}` : ''}`;
}

function shortToolName(name) {
  const raw = String(name || 'tool');
  const scoped = raw.includes('__') ? raw.split('__').filter(Boolean).pop() : raw;
  const compact = scoped.replace(/Tool$/, '');
  return ellipsize(compact, 16);
}

function topTools(toolCounts) {
  const ignored = new Set(['TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList']);
  return Object.entries(toolCounts || {})
    .filter(([name, count]) => count > 0 && !ignored.has(name))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([name, count]) => `${shortToolName(name)}×${count}`);
}

function stat(config, key, value, hue = 'cyan') {
  return `${color(config, hue, key)} ${value}`;
}

function getPath(object, pathParts) {
  return pathParts.reduce((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return value[key];
  }, object);
}

function firstPathNumber(object, paths) {
  for (const pathParts of paths) {
    const value = num(getPath(object, pathParts));
    if (value !== null) return value;
  }
  return null;
}

const OFFICIAL_REMAINING_PATHS = [
  ['credits', 'remaining_credits'], ['credits', 'remainingCredits'], ['credits', 'remaining'],
  ['billing', 'remaining_credits'], ['billing', 'remainingCredits'], ['billing', 'balance_credits'], ['billing', 'balanceCredits'],
  ['plan', 'remaining_credits'], ['plan', 'remainingCredits'],
  ['quota', 'remaining_credits'], ['quota', 'remainingCredits'],
  ['remaining_credits'], ['remainingCredits']
];

const OFFICIAL_TOTAL_PATHS = [
  ['credits', 'total_credits'], ['credits', 'totalCredits'], ['credits', 'total'],
  ['billing', 'total_credits'], ['billing', 'totalCredits'], ['billing', 'total'],
  ['plan', 'total_credits'], ['plan', 'totalCredits'], ['plan', 'total'],
  ['quota', 'total_credits'], ['quota', 'totalCredits'], ['quota', 'total'],
  ['total_credits'], ['totalCredits']
];

const OFFICIAL_USED_PATHS = [
  ['credits', 'used_credits'], ['credits', 'usedCredits'], ['credits', 'used'],
  ['billing', 'used_credits'], ['billing', 'usedCredits'], ['billing', 'used'],
  ['plan', 'used_credits'], ['plan', 'usedCredits'], ['plan', 'used'],
  ['quota', 'used_credits'], ['quota', 'usedCredits'], ['quota', 'used'],
  ['used_credits'], ['usedCredits']
];

function officialCreditEstimate(status) {
  const total = firstPathNumber(status, OFFICIAL_TOTAL_PATHS);
  if (total === null || total <= 0) return null;

  const remainingValue = firstPathNumber(status, OFFICIAL_REMAINING_PATHS);
  if (remainingValue !== null) {
    const remaining = Math.max(0, remainingValue);
    return { remaining, total, used: Math.max(0, total - remaining), source: 'official' };
  }

  const usedValue = firstPathNumber(status, OFFICIAL_USED_PATHS);
  if (usedValue !== null) {
    const used = Math.max(0, usedValue);
    return { remaining: Math.max(0, total - used), total, used, source: 'official' };
  }

  return null;
}

function creditEstimate(status, config, transcriptSummary) {
  const official = officialCreditEstimate(status || {});
  if (official) return official;

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
      safeStatus.exceeds_200k_tokens ? color(safeConfig, ['bold', 'brightYellow'], '>200k') : null,
      display.showCache && ctx.cache ? stat(safeConfig, t('hud.cache'), formatTokens(ctx.cache), 'blue') : null
    ]);
    parts.push(contextLine);
  }

  const credits = creditEstimate(safeStatus, safeConfig, transcriptSummary);
  if (display.showTokens || display.showDuration || display.showLinesChanged || display.showCost || credits) {
    const statParts = [];
    if (display.showTokens) {
      statParts.push(stat(safeConfig, t('hud.in'), formatTokens(ctx.totalInput), 'green'));
      statParts.push(stat(safeConfig, t('hud.out'), formatTokens(ctx.totalOutput), 'green'));
    }
    if (display.showDuration) {
      statParts.push(stat(safeConfig, t('hud.time'), formatDuration(cost.total_duration_ms), 'yellow'));
      statParts.push(stat(safeConfig, t('hud.api'), formatDuration(cost.total_api_duration_ms), 'yellow'));
    }
    if (display.showLinesChanged) {
      statParts.push(stat(safeConfig, 'Δ', `+${num(cost.total_lines_added) || 0} -${num(cost.total_lines_removed) || 0}`, 'magenta'));
    }
    if (display.showCost && Number.isFinite(num(cost.total_cost_usd))) {
      statParts.push(stat(safeConfig, '$', Number(cost.total_cost_usd).toFixed(4), 'brightYellow'));
    }
    if (credits) {
      statParts.push(stat(safeConfig, t('hud.credits'), `${trim(credits.remaining)}/${trim(credits.total)}`, 'brightBlue'));
    }
    parts.push(`${label(safeConfig, t('hud.tok'), 'brightBlue')} ${joinParts(safeConfig, statParts)}`);
  }

  if (display.showTools || display.showAgents || display.showTasks) {
    const activityParts = [];
    if (display.showTools) {
      const tools = topTools(transcriptSummary.toolCounts);
      activityParts.push(stat(safeConfig, t('hud.tools'), tools.length ? tools.join(' ') : t('hud.idle'), 'cyan'));
    }
    if (display.showAgents) {
      activityParts.push(stat(safeConfig, t('hud.agents'), transcriptSummary.agentCount || 0, 'magenta'));
    }
    if (display.showTasks) {
      const tasks = transcriptSummary.tasks || { total: 0, completed: 0 };
      const total = num(tasks.total) || 0;
      const completed = num(tasks.completed) || 0;
      const taskPct = total ? (completed / total) * 100 : 0;
      const taskBar = progressBar(safeConfig, taskPct, safeConfig.taskBarWidth || 8, total && completed >= total ? 'brightGreen' : 'brightCyan');
      activityParts.push(`${stat(safeConfig, t('hud.tasks'), `${taskBar} ${completed}/${total}`, 'brightCyan')}`);
    }
    parts.push(`${label(safeConfig, t('hud.act'), 'brightGreen')} ${joinParts(safeConfig, activityParts)}`);
  }

  return parts.join('\n');
}

module.exports = { render, contextStats, creditEstimate, officialCreditEstimate, formatTokens, formatDuration };
