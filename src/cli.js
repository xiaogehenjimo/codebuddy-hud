#!/usr/bin/env node
const fs = require('fs');
const { defaultConfig, loadConfig, ensureConfig, setupStatusLine, uninstallStatusLine, paths, writeJson } = require('./config');
const { createTranslator } = require('./i18n');
const { render } = require('./render');
const { summarizeTranscript } = require('./transcript');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function parseStatus(input) {
  if (!input.trim()) return {};
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

function commandStatus() {
  const input = readStdin();
  const status = parseStatus(input);
  const config = loadConfig();
  let summary = { toolCounts: {}, agentCount: 0, tasks: { total: 0, completed: 0 }, creditTotal: 0 };

  try {
    summary = summarizeTranscript(status, config);
  } catch {
    summary = { toolCounts: {}, agentCount: 0, tasks: { total: 0, completed: 0 }, creditTotal: 0 };
  }

  try {
    process.stdout.write(`${render(status, config, summary)}\n`);
  } catch {
    const model = status.model && (status.model.display_name || status.model.id) || createTranslator(config)('hud.title');
    process.stdout.write(`${model}\n`);
  }
}

function collectPaths(value, prefix = '') {
  if (!value || typeof value !== 'object') return [];
  const paths = [];
  for (const [key, child] of Object.entries(value)) {
    const current = prefix ? `${prefix}.${key}` : key;
    paths.push(`${current} (${Array.isArray(child) ? 'array' : typeof child})`);
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      paths.push(...collectPaths(child, current));
    }
  }
  return paths;
}

function commandInspect() {
  const config = loadConfig();
  const t = createTranslator(config);
  const status = parseStatus(readStdin());
  const lines = [t('cli.topLevelKeys'), ...Object.keys(status).map((key) => `  ${key}`), '', t('cli.paths'), ...collectPaths(status).map((line) => `  ${line}`)];
  process.stdout.write(`${lines.join('\n')}\n`);
}

function commandSetup() {
  const config = ensureConfig();
  const t = createTranslator(config);
  const result = setupStatusLine();
  process.stdout.write(`${t('cli.configured')}\n${result.settingsPath}\n${result.command}\n`);
}

function commandUninstall() {
  const config = loadConfig();
  const t = createTranslator(config);
  const result = uninstallStatusLine();
  process.stdout.write(`${t('cli.updated')} ${result.settingsPath}\n${result.restored ? t('cli.restoredPrevious') : t('cli.removedHud')}\n`);
}

function commandConfigPath() {
  ensureConfig();
  process.stdout.write(`${paths.configPath}\n`);
}

function parseConfigValue(raw) {
  if (raw === undefined) return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function getConfigValue(config, keyPath) {
  return keyPath.split('.').reduce((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return value[key];
  }, config);
}

function setConfigValue(config, keyPath, value, t = createTranslator(config)) {
  const keys = keyPath.split('.').filter(Boolean);
  if (!keys.length) throw new Error(t('error.missingConfigPath'));
  let target = config;
  for (const key of keys.slice(0, -1)) {
    if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
    target = target[key];
  }
  target[keys[keys.length - 1]] = value;
}

function printConfigureHelp(t) {
  process.stdout.write(`${t('cli.configTitle')}\n\n${t('cli.configFile')}\n  ${paths.configPath}\n\n${t('cli.usage')}\n  codebuddy-hud.js configure list\n  codebuddy-hud.js configure get <path>\n  codebuddy-hud.js configure set <path> <value>\n  codebuddy-hud.js configure toggle <path>\n  codebuddy-hud.js configure preset <default|minimal|full>\n  codebuddy-hud.js configure reset\n\n${t('cli.examples')}\n  codebuddy-hud.js configure set language en\n  codebuddy-hud.js configure set credits.enabled true\n  codebuddy-hud.js configure set credits.totalCredits 500\n  codebuddy-hud.js configure set credits.usedCreditsOffset 100\n  codebuddy-hud.js configure set credits.snapshotPath ~/.codebuddy/quota.json\n  codebuddy-hud.js configure set credits.warningRemainingPercent 25\n  codebuddy-hud.js configure toggle display.showCredits\n  codebuddy-hud.js configure set barWidth 20\n  codebuddy-hud.js configure set colors.enabled false\n  codebuddy-hud.js configure preset full\n`);
}

function presetConfig(name) {
  const config = JSON.parse(JSON.stringify(defaultConfig));
  if (name === 'default') return config;
  if (name === 'minimal') {
    config.display.showTools = false;
    config.display.showAgents = false;
    config.display.showTasks = false;
    config.display.showCache = false;
    config.display.showDuration = false;
    config.display.showLinesChanged = false;
    config.barWidth = 12;
    return config;
  }
  if (name === 'full') {
    config.display.showCost = true;
    config.display.showCredits = false;
    config.display.showCache = true;
    config.display.showTools = true;
    config.display.showAgents = true;
    config.display.showTasks = true;
    config.barWidth = 18;
    config.taskBarWidth = 10;
    return config;
  }
  return null;
}

function commandConfigure(args) {
  const config = loadConfig();
  const t = createTranslator(config);
  const action = args[0];
  if (!action || action === 'help' || action === '--help' || action === '-h') {
    printConfigureHelp(t);
    return;
  }

  if (action === 'list') {
    process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
    return;
  }

  if (action === 'get') {
    const keyPath = args[1];
    if (!keyPath) throw new Error(t('error.getRequiresPath'));
    process.stdout.write(`${JSON.stringify(getConfigValue(config, keyPath), null, 2)}\n`);
    return;
  }

  if (action === 'set') {
    const keyPath = args[1];
    if (!keyPath || args.length < 3) throw new Error(t('error.setRequiresPathValue'));
    const value = parseConfigValue(args.slice(2).join(' '));
    setConfigValue(config, keyPath, value, t);
    writeJson(paths.configPath, config);
    process.stdout.write(`${t('cli.set')} ${keyPath} = ${JSON.stringify(value)}\n`);
    return;
  }

  if (action === 'toggle') {
    const keyPath = args[1];
    if (!keyPath) throw new Error(t('error.toggleRequiresPath'));
    const current = getConfigValue(config, keyPath);
    if (typeof current !== 'boolean') throw new Error(t('error.notBoolean', { path: keyPath }));
    setConfigValue(config, keyPath, !current, t);
    writeJson(paths.configPath, config);
    process.stdout.write(`${t('cli.set')} ${keyPath} = ${JSON.stringify(!current)}\n`);
    return;
  }

  if (action === 'preset') {
    const name = args[1];
    const next = presetConfig(name);
    if (!next) throw new Error(t('error.presetRequiresName'));
    writeJson(paths.configPath, next);
    process.stdout.write(`${t('cli.appliedPreset', { name })}\n`);
    return;
  }

  if (action === 'reset') {
    writeJson(paths.configPath, defaultConfig);
    process.stdout.write(`${t('cli.resetConfig')}\n`);
    return;
  }

  throw new Error(t('error.unknownConfigureAction', { action }));
}

const command = process.argv[2] || 'status';

try {
  if (command === 'status') commandStatus();
  else if (command === 'inspect') commandInspect();
  else if (command === 'setup') commandSetup();
  else if (command === 'uninstall') commandUninstall();
  else if (command === 'config-path') commandConfigPath();
  else if (command === 'configure' || command === 'config') commandConfigure(process.argv.slice(3));
  else {
    process.stderr.write(`${createTranslator(loadConfig())('error.usage')}\n`);
    process.exit(2);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
