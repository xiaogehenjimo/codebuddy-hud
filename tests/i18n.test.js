const test = require('node:test');
const assert = require('node:assert/strict');
const { createTranslator, normalizeLanguage } = require('../src/i18n');

test('normalizes unsupported languages to zh', () => {
  assert.equal(normalizeLanguage('en'), 'en');
  assert.equal(normalizeLanguage('zh'), 'zh');
  assert.equal(normalizeLanguage('fr'), 'zh');
  assert.equal(normalizeLanguage(undefined), 'zh');
});

test('translates HUD labels in English and Chinese', () => {
  const en = createTranslator({ language: 'en' });
  const zh = createTranslator({ language: 'zh' });

  assert.equal(en('hud.cache'), 'cache');
  assert.equal(en('hud.tools'), 'tools');
  assert.equal(zh('hud.cache'), '缓存');
  assert.equal(zh('hud.tools'), '工具');
});

test('interpolates translated messages', () => {
  const en = createTranslator({ language: 'en' });
  const zh = createTranslator({ language: 'zh' });

  assert.equal(en('cli.appliedPreset', { name: 'full' }), 'Applied full preset');
  assert.equal(zh('cli.appliedPreset', { name: 'full' }), '已应用 full 预设');
});
