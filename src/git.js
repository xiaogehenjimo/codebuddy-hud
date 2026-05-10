const { execFileSync } = require('child_process');

function runGit(cwd, args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      timeout: 500,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return '';
  }
}

function getGitInfo(cwd) {
  if (!cwd) return null;
  if (runGit(cwd, ['rev-parse', '--is-inside-work-tree']) !== 'true') return null;

  const branch = runGit(cwd, ['symbolic-ref', '--quiet', '--short', 'HEAD']) ||
    runGit(cwd, ['rev-parse', '--short', 'HEAD']);
  const dirty = Boolean(runGit(cwd, ['status', '--porcelain', '--ignore-submodules=dirty']));

  let ahead = 0;
  let behind = 0;
  const upstream = runGit(cwd, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (upstream) {
    const counts = runGit(cwd, ['rev-list', '--left-right', '--count', `${upstream}...HEAD`]);
    const [behindRaw, aheadRaw] = counts.split(/\s+/).map((n) => Number(n));
    if (Number.isFinite(aheadRaw)) ahead = aheadRaw;
    if (Number.isFinite(behindRaw)) behind = behindRaw;
  }

  return { branch, dirty, ahead, behind };
}

module.exports = { getGitInfo };
