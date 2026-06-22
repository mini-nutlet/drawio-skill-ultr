#!/usr/bin/env node
/**
 * pick-theme.js — Auto-select theme based on user request
 * Usage: node pick-theme.js "画一个微服务架构图"
 */

function pickTheme(userRequest) {
  const signals = [
    { theme: 'blueprint',   weight: 0, patterns: [
      /架构/, /architecture/, /topology/, /deploy/, /infra/, /网络/, /集群/, /微服务/, /microservice/,
      /k8s/, /kubernetes/, /docker/, /aws/, /云/
    ]},
    { theme: 'editorial',   weight: 0, patterns: [
      /论文/, /paper/, /ieee/, /acm/, /thesis/, /journal/, /投稿/, /latex/, /学术/, /发表/
    ]},
    { theme: 'operations',  weight: 0, patterns: [
      /监控/, /monitor/, /dashboard/, /告警/, /alert/, /运维/, /on-call/, /sre/, /ops/,
      /ci.cd/, /pipeline/, /部署/, /状态/
    ]},
    { theme: 'analytical',  weight: 0, patterns: [
      /数据/, /data/, /分析/, /analytics/, /对比/, /compare/, /etl/, /pipeline/,
      /多维/, /矩阵/, /matrix/
    ]},
    { theme: 'narrative',   weight: 0, patterns: [
      /用户/, /user/, /journey/, /旅程/, /业务/, /business/, /流程/, /flowchart/,
      /故事/, /story/, /客户/, /customer/, /体验/
    ]},
  ];

  const req = userRequest.toLowerCase();
  for (const signal of signals) {
    for (const pattern of signal.patterns) {
      if (pattern.test(req)) { signal.weight += pattern.source.length > 4 ? 3 : 1; }
    }
  }

  signals.sort((a, b) => b.weight - a.weight);
  const best = signals[0];

  if (best.weight === 0) {
    return { theme: 'blueprint', confidence: 'fallback', reason: 'No signal — default to Blueprint' };
  }

  return {
    theme: best.theme,
    confidence: best.weight >= 5 ? 'high' : best.weight >= 2 ? 'medium' : 'low',
    reason: `Matched ${best.theme} patterns with weight ${best.weight}`
  };
}

// CLI
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node pick-theme.js "<user request>"');
  process.exit(1);
}

const result = pickTheme(args.join(' '));
console.log(JSON.stringify(result, null, 2));

module.exports = { pickTheme };
