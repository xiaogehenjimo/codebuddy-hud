const fs = require('fs');
const path = require('path');
const os = require('os');

const pluginRoot = path.resolve(__dirname, '..');
const paths = {
  pluginRoot,
  binPath: path.join(pluginRoot, 'bin', 'codebuddy-hud.js'),
  configPath: process.env.CODEBUDDY_HUD_CONFIG || path.join(pluginRoot, 'config.json'),
  cachePath: process.env.CODEBUDDY_HUD_CACHE || path.join(pluginRoot, '.cache.json'),
  metaPath: process.env.CODEBUDDY_HUD_META || path.join(pluginRoot, '.meta.json'),
  settingsPath: process.env.CODEBUDDY_SETTINGS_PATH || path.join(os.homedir(), '.codebuddy', 'settings.json')
};

const defaultConfig = {
  layout: 'expanded',
  language: 'zh',
  barWidth: 16,
  taskBarWidth: 8,
  maxWidth: 96,
  maxLines: 4,
  transcript: {
    enabled: true,
    maxInitialReadBytes: 262144,
    cacheTtlMs: 1000
  },
  credits: {
    enabled: false,
    totalCredits: 0,
    usedCreditsOffset: 0,
    snapshotPath: '',
    refreshCommand: '',
    refreshIntervalMs: 0,
    maxStalenessMs: 3600000,
    warningRemainingPercent: 25,
    dangerRemainingPercent: 10,
    showBar: true,
    showSource: true,
    showReset: true,
    showStaleness: true
  },
  display: {
    showModel: true,
    showProject: true,
    showGit: true,
    showContext: true,
    showTokens: true,
    showCost: false,
    showCredits: false,
    showDuration: true,
    showLinesChanged: true,
    showTools: false,
    showAgents: false,
    showTasks: false,
    showCache: true
  },
  thresholds: {
    contextWarning: 70,
    contextDanger: 90
  },
  colors: {
    enabled: true
  }
};

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isObject(override)) return { ...base };
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (isObject(value) && isObject(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, filePath);
}

function ensureConfig() {
  if (!fs.existsSync(paths.configPath)) {
    writeJson(paths.configPath, defaultConfig);
    return defaultConfig;
  }
  const current = readJson(paths.configPath, {});
  const merged = deepMerge(defaultConfig, current);
  if (JSON.stringify(current) !== JSON.stringify(merged)) {
    writeJson(paths.configPath, merged);
  }
  return merged;
}

function loadConfig() {
  return ensureConfig();
}

function hudCommand() {
  return `node ${paths.binPath} status`;
}

function setupStatusLine() {
  ensureConfig();
  const settings = readJson(paths.settingsPath, {});
  const command = hudCommand();
  const meta = readJson(paths.metaPath, {});

  if (!meta.previousStatusLine && settings.statusLine && settings.statusLine.command !== command) {
    meta.previousStatusLine = settings.statusLine;
    writeJson(paths.metaPath, meta);
  }

  settings.statusLine = {
    type: 'command',
    command
  };
  writeJson(paths.settingsPath, settings);
  return { settingsPath: paths.settingsPath, command };
}

function uninstallStatusLine() {
  const settings = readJson(paths.settingsPath, {});
  const meta = readJson(paths.metaPath, {});
  if (meta.previousStatusLine) {
    settings.statusLine = meta.previousStatusLine;
  } else if (settings.statusLine && settings.statusLine.command === hudCommand()) {
    delete settings.statusLine;
  }
  writeJson(paths.settingsPath, settings);
  return { settingsPath: paths.settingsPath, restored: Boolean(meta.previousStatusLine) };
}

module.exports = {
  paths,
  defaultConfig,
  deepMerge,
  loadConfig,
  ensureConfig,
  readJson,
  writeJson,
  setupStatusLine,
  uninstallStatusLine,
  hudCommand
};
