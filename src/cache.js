const { paths, readJson, writeJson } = require('./config');

function readCache() {
  return readJson(paths.cachePath, {});
}

function writeCache(cache) {
  writeJson(paths.cachePath, cache || {});
}

function resetCache(sessionId, transcriptPath) {
  return {
    sessionId,
    transcriptPath,
    offset: 0,
    size: 0,
    toolCounts: {},
    taskCreated: 0,
    completedTaskIds: [],
    agentCount: 0,
    creditTotal: 0,
    usageKeys: []
  };
}

module.exports = {
  readCache,
  writeCache,
  resetCache
};
