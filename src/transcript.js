const fs = require('fs');
const { readCache, writeCache, resetCache } = require('./cache');

function parseArgs(raw) {
  if (!raw || typeof raw !== 'string') return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function addTool(cache, name) {
  cache.toolCounts[name] = (cache.toolCounts[name] || 0) + 1;
  if (name === 'Agent') cache.agentCount = (cache.agentCount || 0) + 1;
}

function addUsage(cache, event) {
  const usage = event && event.providerData && event.providerData.rawUsage;
  if (!usage || typeof usage !== 'object') return;
  const key = (event.providerData && event.providerData.messageId) || event.id;
  if (!key) return;

  const seen = new Set(cache.usageKeys || []);
  if (seen.has(key)) return;
  seen.add(key);
  cache.usageKeys = Array.from(seen).slice(-500);

  if (Number.isFinite(usage.credit)) {
    cache.creditTotal = (cache.creditTotal || 0) + usage.credit;
  }
}

function updateTasks(cache, event) {
  if (event.name === 'TaskCreate') {
    cache.taskCreated = (cache.taskCreated || 0) + 1;
    return;
  }

  if (event.name !== 'TaskUpdate') return;
  const args = parseArgs(event.arguments);
  if (args.status !== 'completed' || !args.taskId) return;
  const completed = new Set(cache.completedTaskIds || []);
  completed.add(String(args.taskId));
  cache.completedTaskIds = Array.from(completed);
}

function processLine(cache, line) {
  if (!line.trim()) return;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return;
  }

  addUsage(cache, event);

  if (event.type !== 'function_call' || !event.name) return;
  addTool(cache, event.name);
  updateTasks(cache, event);
}

function readTranscriptSlice(filePath, start) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const stat = fs.fstatSync(fd);
    const size = stat.size;
    if (start >= size) return { text: '', size };
    const length = size - start;
    const buffer = Buffer.allocUnsafe(length);
    fs.readSync(fd, buffer, 0, length, start);
    return { text: buffer.toString('utf8'), size };
  } finally {
    fs.closeSync(fd);
  }
}

function summarizeTranscript(status, config) {
  const transcriptPath = status && status.transcript_path;
  const sessionId = status && status.session_id;
  if (!config.transcript || !config.transcript.enabled || !transcriptPath) {
    return { toolCounts: {}, agentCount: 0, tasks: { total: 0, completed: 0 }, creditTotal: 0 };
  }

  let stat;
  try {
    stat = fs.statSync(transcriptPath);
  } catch {
    return { toolCounts: {}, agentCount: 0, tasks: { total: 0, completed: 0 }, creditTotal: 0 };
  }

  let cache = readCache();
  const sameSource = cache.sessionId === sessionId && cache.transcriptPath === transcriptPath && cache.offset <= stat.size;
  if (!sameSource) {
    cache = resetCache(sessionId, transcriptPath);
    cache.offset = Math.max(0, stat.size - (config.transcript.maxInitialReadBytes || 262144));
  }

  const start = cache.offset || 0;
  const { text, size } = readTranscriptSlice(transcriptPath, start);
  let lines = text.split('\n');
  if (start > 0 && lines.length > 0) {
    lines = lines.slice(1);
  }

  for (const line of lines) {
    processLine(cache, line);
  }

  cache.sessionId = sessionId;
  cache.transcriptPath = transcriptPath;
  cache.offset = size;
  cache.size = size;
  writeCache(cache);

  const completed = new Set(cache.completedTaskIds || []);
  return {
    toolCounts: cache.toolCounts || {},
    agentCount: cache.agentCount || 0,
    tasks: {
      total: cache.taskCreated || 0,
      completed: completed.size
    },
    creditTotal: cache.creditTotal || 0
  };
}

module.exports = { summarizeTranscript };
