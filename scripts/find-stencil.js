#!/usr/bin/env node
/**
 * find-stencil.js — 有限聚焦搜索 stencil-index.json（得分阈值 + 分类过滤 + 结果截断）
 * Usage: node find-stencil.js "<query>" [--category aws] [--limit 5]
 *        node find-stencil.js "kubernetes pod"
 *        node find-stencil.js --list [group]
 */

const fs = require('fs');
const path = require('path');

const STENCIL_INDEX = path.join(__dirname, '..', 'assets', 'stencils', 'stencil-index.json');
const MIN_SCORE = 4;
const DEFAULT_LIMIT = 8;

// ★ 图元优先级权重: 系统图元 > 用户SVG > 云厂商 > 默认回退
const SOURCE_PRIORITY = {
  'builtin':         50,  // 系统内置 (rounded-rect, cylinder3, hexagon...)
  'cloud-providers': 40,  // 云厂商 (AWS, GCP, Azure)
  'kubernetes':      35,  // K8s 生态
  'custom-generic':  30,  // 用户 SVG — 通用
  'custom-ml':       30,  // 用户 SVG — ML
  'custom-security': 30,  // 用户 SVG — 安全
};

function loadStencils() {
  if (!fs.existsSync(STENCIL_INDEX)) {
    throw new Error(`Stencil index not found: ${STENCIL_INDEX}`);
  }
  return JSON.parse(fs.readFileSync(STENCIL_INDEX, 'utf8'));
}

function normalizeItem(name, value) {
  if (typeof value === 'string') {
    return { name, style: value, use: '', tags: [] };
  }
  return {
    name,
    style: value.style || '',
    use: value.use || value.description || '',
    tags: value.tags || [],
    category: value.category || '',
  };
}

/**
 * 有限聚焦搜索:
 *   - 精确匹配加权 (name === word → +15)
 *   - 类别名加权 (group === word → +8)
 *   - 忽略低于 MIN_SCORE 的结果
 *   - 返回最多 limit 条
 */
function search(query, stencils, opts = {}) {
  const q = query.toLowerCase();
  const words = q.split(/[\s\-_/]+/).filter(Boolean);
  const limit = opts.limit || DEFAULT_LIMIT;
  const categoryFilter = (opts.category || '').toLowerCase();
  const results = [];

  for (const [group, items] of Object.entries(stencils)) {
    if (group === 'description') continue;
    if (typeof items !== 'object' || items === null) continue;
    if (categoryFilter && group.toLowerCase() !== categoryFilter) continue;

    for (const [key, raw] of Object.entries(items)) {
      const item = normalizeItem(key, raw);
      const nameLower = item.name.toLowerCase();
      const useLower = (item.use || '').toLowerCase();
      const groupLower = group.toLowerCase();
      const tagTexts = item.tags.map(t => (t || '').toLowerCase());

      let score = 0;

      for (const word of words) {
        // ★ 精确名称匹配 → 最高权重
        if (nameLower === word) score += 15;
        // ★ 名称包含词 → 高权重
        else if (nameLower.includes(word)) score += 6;
        // ★ 用途描述包含 → 中权重
        else if (useLower.includes(word)) score += 4;
        // ★ 分组名匹配 → 中权重
        else if (groupLower === word) score += 8;
        else if (groupLower.includes(word)) score += 3;
        // ★ 标签匹配 → 低权重
        else {
          for (const tag of tagTexts) {
            if (tag === word) { score += 5; break; }
            else if (tag.includes(word)) { score += 2; break; }
          }
        }
        // ★ 模糊后缀匹配 → 最低权重
        if (score === 0 && word.length >= 4) {
          for (const target of [nameLower, useLower, groupLower, ...tagTexts]) {
            if (target.includes(word.slice(0, -1))) { score += 1; break; }
          }
        }
      }

      // 过滤低分噪音
      if (score < MIN_SCORE) continue;

      // ★ 来源优先级加分
      const sourceBonus = SOURCE_PRIORITY[group] || 0;

      results.push({
        name: item.name,
        group,
        use: item.use,
        tags: item.tags,
        style: item.style,
        score: score + sourceBonus,
        _rawScore: score,
        _priority: sourceBonus,
      });
    }
  }

  // 按总分降序（匹配分 + 来源优先级），同分按组名
  return results
    .sort((a, b) => b.score - a.score || a.group.localeCompare(b.group))
    .slice(0, limit);
}

function listByGroup(filterGroup, stencils) {
  const groups = filterGroup
    ? { [filterGroup]: stencils[filterGroup] }
    : stencils;

  let total = 0;
  for (const [group, items] of Object.entries(groups)) {
    if (group === 'description') continue;
    if (!items || typeof items !== 'object') continue;
    const entries = Object.entries(items);
    if (entries.length === 0) continue;
    total += entries.length;
    console.log(`\n  ${group}/ (${entries.length})`);
    for (const [key, raw] of entries) {
      const item = normalizeItem(key, raw);
      const use = item.use ? ` — ${item.use}` : '';
      console.log(`    ${item.name.padEnd(28)} ${use}`);
    }
  }
  console.log(`\n  Total: ${total} stencils\n`);
}

// ── CLI ──

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    const filter = args[args.indexOf('--list') + 1];
    const stencils = loadStencils();
    listByGroup(filter && !filter.startsWith('-') ? filter : null, stencils);
    return;
  }

  if (args.length < 1) {
    console.log('Usage: node find-stencil.js "<query>" [--category aws|kubernetes|builtin] [--limit 5]');
    console.log('       node find-stencil.js --list [group]');
    process.exit(1);
  }

  const catIdx = args.indexOf('--category');
  const category = catIdx > -1 ? args[catIdx + 1] : null;
  const limIdx = args.indexOf('--limit');
  const limit = limIdx > -1 ? parseInt(args[limIdx + 1]) : DEFAULT_LIMIT;
  // Build query excluding option values
  const skipSet = new Set();
  if (catIdx > -1) { skipSet.add(catIdx); skipSet.add(catIdx + 1); }
  if (limIdx > -1) { skipSet.add(limIdx); skipSet.add(limIdx + 1); }
  const query = args.filter((a, i) => !a.startsWith('-') && !skipSet.has(i)).join(' ');

  const stencils = loadStencils();
  const results = search(query, stencils, { category, limit });

  if (results.length === 0) {
    console.log(`\n  No stencils found for "${query}" (min score: ${MIN_SCORE})`);
    console.log('  Try: broader query, or --list to browse all\n');
    process.exit(1);
  }

  const prioLabel = (p) => p >= 50 ? '★系统' : p >= 35 ? '◆云' : p >= 30 ? '◇用户' : '·默认';
  console.log(`\nStencils matching "${query}" (top ${results.length}, min score ${MIN_SCORE}):\n`);
  for (const r of results) {
    const bar = '█'.repeat(Math.min(Math.ceil(r._rawScore / 3), 4)) + '░'.repeat(4 - Math.min(Math.ceil(r._rawScore / 3), 4));
    console.log(`  ${bar} ${prioLabel(r._priority)} ${r.name.padEnd(26)} ${r.group.padEnd(16)} ${r.use}`);
    if (r.style) console.log(`     ↳ ${r.style.slice(0, 80)}`);
  }
  console.log();
}

if (require.main === module) { main().catch(console.error); }

module.exports = { search, loadStencils, MIN_SCORE, DEFAULT_LIMIT };
