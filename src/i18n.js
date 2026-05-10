const dictionaries = {
  en: {
    hud: {
      title: 'CodeBuddy',
      git: 'git',
      ctx: 'ctx',
      tok: 'tok',
      cache: 'cache',
      in: 'in',
      out: 'out',
      time: 'time',
      api: 'api',
      credits: 'credits',
      tools: 'tools',
      idle: 'idle',
      agents: 'agents',
      tasks: 'tasks',
      act: 'act'
    },
    cli: {
      configTitle: 'CodeBuddy HUD config',
      configFile: 'Config file:',
      usage: 'Usage:',
      examples: 'Examples:',
      configured: 'Configured CodeBuddy HUD statusLine',
      updated: 'Updated',
      restoredPrevious: 'Restored previous statusLine',
      removedHud: 'Removed CodeBuddy HUD statusLine',
      topLevelKeys: 'top-level keys:',
      paths: 'paths:',
      set: 'Set',
      appliedPreset: 'Applied {name} preset',
      resetConfig: 'Reset HUD config to defaults'
    },
    error: {
      missingConfigPath: 'missing config path',
      getRequiresPath: 'configure get requires <path>',
      setRequiresPathValue: 'configure set requires <path> <value>',
      toggleRequiresPath: 'configure toggle requires <path>',
      notBoolean: '{path} is not a boolean',
      presetRequiresName: 'configure preset requires default, minimal, or full',
      unknownConfigureAction: 'unknown configure action: {action}',
      usage: 'Usage: codebuddy-hud.js <status|inspect|setup|uninstall|config-path|configure>'
    }
  },
  zh: {
    hud: {
      title: 'CodeBuddy',
      git: '分支',
      ctx: '上下文',
      tok: '令牌',
      cache: '缓存',
      in: '输入',
      out: '输出',
      time: '耗时',
      api: 'API',
      credits: '积分',
      tools: '工具',
      idle: '空闲',
      agents: '代理',
      tasks: '任务',
      act: '活动'
    },
    cli: {
      configTitle: 'CodeBuddy HUD 配置',
      configFile: '配置文件：',
      usage: '用法：',
      examples: '示例：',
      configured: '已配置 CodeBuddy HUD statusLine',
      updated: '已更新',
      restoredPrevious: '已恢复之前的 statusLine',
      removedHud: '已移除 CodeBuddy HUD statusLine',
      topLevelKeys: '顶层字段：',
      paths: '字段路径：',
      set: '已设置',
      appliedPreset: '已应用 {name} 预设',
      resetConfig: '已重置 HUD 配置为默认值'
    },
    error: {
      missingConfigPath: '缺少配置路径',
      getRequiresPath: 'configure get 需要 <path>',
      setRequiresPathValue: 'configure set 需要 <path> <value>',
      toggleRequiresPath: 'configure toggle 需要 <path>',
      notBoolean: '{path} 不是布尔值',
      presetRequiresName: 'configure preset 需要 default、minimal 或 full',
      unknownConfigureAction: '未知 configure 操作：{action}',
      usage: '用法：codebuddy-hud.js <status|inspect|setup|uninstall|config-path|configure>'
    }
  }
};

function normalizeLanguage(value) {
  return value === 'en' ? 'en' : 'zh';
}

function getByPath(object, key) {
  return key.split('.').reduce((value, part) => {
    if (!value || typeof value !== 'object') return undefined;
    return value[part];
  }, object);
}

function interpolate(template, params) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) => {
    if (!params || params[key] === undefined) return match;
    return String(params[key]);
  });
}

function createTranslator(config) {
  const language = normalizeLanguage(config && config.language);
  const dictionary = dictionaries[language] || dictionaries.zh;
  const fallback = dictionaries.zh;

  return function translate(key, params) {
    const value = getByPath(dictionary, key) || getByPath(fallback, key) || key;
    return interpolate(value, params);
  };
}

module.exports = {
  dictionaries,
  normalizeLanguage,
  createTranslator
};
