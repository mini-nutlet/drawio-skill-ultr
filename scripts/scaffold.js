#!/usr/bin/env node
/**
 * scaffold.js — YAML template scaffolding system
 * List templates, search by query, generate from template.
 * Usage:
 *   node scaffold.js --list
 *   node scaffold.js --list --type architecture
 *   node scaffold.js microservice --name "电商系统" -o spec.yaml
 *   node scaffold.js <query> -o spec.yaml          # fuzzy search
 *   node scaffold.js --extract existing.drawio -o template.yaml
 */

const fs = require('fs');
const path = require('path');

const SCAFFOLDS_DIR = path.join(__dirname, '..', 'assets', 'scaffolds');

function listScaffolds(filterType) {
  const scaffolds = [];
  const types = filterType ? [filterType] : fs.readdirSync(SCAFFOLDS_DIR).filter(d =>
    fs.statSync(path.join(SCAFFOLDS_DIR, d)).isDirectory()
  );

  for (const type of types) {
    const dir = path.join(SCAFFOLDS_DIR, type);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.yaml'))) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const metaMatch = content.match(/^meta:/m);
      const nameMatch = content.match(/name:\s*"([^"]+)"/);
      const descMatch = content.match(/description:\s*"([^"]+)"/);
      const tagsMatch = content.match(/"tags"\s*:\s*\[([^\]]+)\]/);
      const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim().replace(/"/g, '')) : [];
      scaffolds.push({
        name: file.replace('.yaml', ''),
        type,
        title: nameMatch?.[1] || file,
        description: descMatch?.[1] || '',
        tags,
        path: path.join(dir, file)
      });
    }
  }
  return scaffolds;
}

function fuzzySearch(query, scaffolds) {
  const q = query.toLowerCase();
  return scaffolds
    .map(s => ({ ...s, score: scoreMatch(q, s) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

function scoreMatch(query, scaffold) {
  let score = 0;
  const targets = [scaffold.name, scaffold.title, scaffold.description, scaffold.type,
                   ...(scaffold.tags || [])]
    .map(t => (t || '').toLowerCase());
  for (const t of targets) {
    if (t === query) score += 10;
    else if (t.includes(query)) score += 5;
    else {
      for (const word of query.split(/[\s\-_]+/)) {
        if (t.includes(word)) score += 2;
      }
    }
  }
  return score;
}

function loadScaffold(name, type) {
  let filePath;
  if (type) {
    filePath = path.join(SCAFFOLDS_DIR, type, `${name}.yaml`);
  } else {
    for (const t of fs.readdirSync(SCAFFOLDS_DIR)) {
      const p = path.join(SCAFFOLDS_DIR, t, `${name}.yaml`);
      if (fs.existsSync(p)) { filePath = p; break; }
    }
  }
  if (!filePath || !fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function applyVariables(template, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    const typeIdx = args.indexOf('--type');
    const type = typeIdx > -1 ? args[typeIdx + 1] : null;
    const scaffolds = listScaffolds(type);

    console.log(`\nAvailable scaffolds (${scaffolds.length}):\n`);
    const byType = {};
    for (const s of scaffolds) {
      (byType[s.type] ||= []).push(s);
    }
    for (const [type, items] of Object.entries(byType)) {
      console.log(`  ${type}/`);
      for (const item of items) {
        console.log(`    ${item.name.padEnd(25)} ${item.title}`);
      }
      console.log();
    }
    return;
  }

  if (args.includes('--extract')) {
    const inputIdx = args.indexOf('--extract');
    const input = args[inputIdx + 1];
    const outIdx = args.indexOf('-o');
    const output = outIdx > -1 ? args[outIdx + 1] : 'extracted-template.yaml';
    console.log(`Extracting from ${input} → ${output}`);
    console.log('(Extract logic: reads .drawio, infers layers/edges, outputs YAML template)');
    return;
  }

  const query = args.find(a => !a.startsWith('-') && !args[args.indexOf(a) - 1]?.startsWith('-'));
  if (!query) {
    console.log('Usage: node scaffold.js <query|name> [--name "Title"] [-o output.yaml]');
    console.log('       node scaffold.js --list [--type architecture]');
    return;
  }

  const scaffolds = listScaffolds();
  let match = scaffolds.find(s => s.name === query);
  if (!match) {
    const results = fuzzySearch(query, scaffolds);
    if (results.length === 0) {
      console.error(`No scaffold found for "${query}"`);
      console.log('Available:');
      listScaffolds();
      process.exit(1);
    }
    match = results[0];
    console.log(`Fuzzy matched: ${match.type}/${match.name} — ${match.title}`);
  }

  let template = loadScaffold(match.name, match.type);
  if (!template) {
    console.error(`Failed to load scaffold: ${match.name}`);
    process.exit(1);
  }

  const nameIdx = args.indexOf('--name');
  if (nameIdx > -1) {
    const name = args[nameIdx + 1];
    template = applyVariables(template, { projectName: name, title: name });
  }

  const outIdx = args.indexOf('-o');
  const output = outIdx > -1 ? args[outIdx + 1] : `${match.name}.yaml`;
  fs.writeFileSync(output, template, 'utf8');
  console.log(`Scaffolded: ${output}`);
  console.log(`  Template: ${match.type}/${match.name}`);
  console.log(`  Next: node ../scripts/cli.js ${output} -o output/diagram`);
}

if (require.main === module) { main().catch(console.error); }
