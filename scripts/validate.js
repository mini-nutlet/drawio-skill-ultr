#!/usr/bin/env node
/**
 * validate.js — Structural + font + emoji validation
 * Usage: node validate.js <file.drawio>
 */

const fs = require('fs');
// Only match known emoji — explicitly exclude CJK
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{23F0}-\u{23FF}\u{2B50}\u{2B55}\u{231A}\u{231B}\u{2328}\u{23CF}\u{24C2}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}]/u;

function hasEmoji(text) {
  // Only flag if the text contains actual emoji AND is not purely CJK
  if (EMOJI_REGEX.test(text)) return true;
  // Common emoji ASCII patterns
  if (/[🚀🔐🔍📊💬💰🤖📌✅⏳🔴🟢🟡]/u.test(text)) return true;
  return false;
}
const MIN_FONT_SIZE = 8;
const PPT_LABEL_MIN = 12;
const PPT_LABEL_MAX = 16;
const MAX_LABEL_CHARS = 25;
const MAX_LABEL_LINES = 2;

function extractStyleAttr(style, attr) {
  const regex = new RegExp(`${attr}=([^;]+)`);
  const match = style?.match(regex);
  return match ? match[1] : null;
}

function validate(drawioContent) {
  const issues = [];

  // XML well-formedness
  const idSet = new Set();
  const idPattern = /\bid="([^"]+)"/g;
  let match;
  while ((match = idPattern.exec(drawioContent)) !== null) {
    if (idSet.has(match[1])) {
      issues.push({ severity: 'error', type: 'duplicate-id', message: `Duplicate id="${match[1]}"` });
    }
    idSet.add(match[1]);
  }

  // Extract cells
  const cellPattern = /<mxCell\s[^>]*\/>/g;
  const cells = [];
  let cellMatch;
  while ((cellMatch = cellPattern.exec(drawioContent)) !== null) {
    cells.push(cellMatch[0]);
  }
  // Also match non-self-closing mxCell
  const cellPattern2 = /<mxCell\s[^>]*>[\s\S]*?<\/mxCell>/g;
  while ((cellMatch = cellPattern2.exec(drawioContent)) !== null) {
    cells.push(cellMatch[0]);
  }

  for (const cell of cells) {
    const valueMatch = cell.match(/value="([^"]*)"/);
    const value = valueMatch ? valueMatch[1] : '';
    const style = cell.match(/style="([^"]*)"/)?.[1] || '';
    const edge = cell.includes('edge="1"');
    const vertex = cell.includes('vertex="1"');

    // 1. Emoji check (only actual emoji, not CJK)
    if (value && hasEmoji(value)) {
      issues.push({ severity: 'error', type: 'emoji-in-label',
        message: `Emoji in label: "${value}". Use shape/color for semantics.`,
        fix: 'strip-emoji' });
    }

    // 2. Font size floor
    if (vertex && !edge) {
      const fontSize = extractStyleAttr(style, 'fontSize');
      if (fontSize && parseFloat(fontSize) < MIN_FONT_SIZE) {
        issues.push({ severity: 'error', type: 'font-too-small',
          message: `Font size ${fontSize}pt < ${MIN_FONT_SIZE}pt minimum (PPT floor).`,
          fix: 'increase-font' });
      }
    }

    // 3. Node label length
    if (vertex && value && value.length > MAX_LABEL_CHARS) {
      issues.push({ severity: 'error', type: 'label-too-long',
        message: `Label "${value.slice(0, 20)}..." is ${value.length} chars. Max ${MAX_LABEL_CHARS}.`,
        fix: 'shorten-label' });
    }

    // 4. Node label lines
    if (vertex && value && value.split('\n').length > MAX_LABEL_LINES) {
      issues.push({ severity: 'error', type: 'label-too-many-lines',
        message: `Label "${value.slice(0, 20)}..." spans ${value.split('\n').length} lines. Max ${MAX_LABEL_LINES}.`,
        fix: 'shorten-label' });
    }

    // 5. Font size in PPT range (warning only)
    if (vertex && !edge) {
      const fontSize = extractStyleAttr(style, 'fontSize');
      if (fontSize && (parseFloat(fontSize) < PPT_LABEL_MIN || parseFloat(fontSize) > PPT_LABEL_MAX)) {
        if (parseFloat(fontSize) >= MIN_FONT_SIZE) {
          issues.push({ severity: 'warning', type: 'font-outside-ppt-range',
            message: `Font size ${fontSize}pt outside PPT sweet spot (${PPT_LABEL_MIN}-${PPT_LABEL_MAX}pt).` });
        }
      }
    }

    // 6. Missing fontFamily on new elements
    if (vertex && !style.includes('fontFamily=') && value) {
      issues.push({ severity: 'warning', type: 'missing-font-family',
        message: `No explicit fontFamily on "${value.slice(0, 20)}".` });
    }
  }

  return issues;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: node validate.js <file.drawio>');
    process.exit(1);
  }

  const input = args[0];
  if (!fs.existsSync(input)) {
    console.error(`File not found: ${input}`);
    process.exit(1);
  }

  const content = fs.readFileSync(input, 'utf8');
  const issues = validate(content);

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  console.log(`\nValidation: ${input}\n`);

  if (issues.length === 0) {
    console.log('  ✅ All checks passed.\n');
    return;
  }

  for (const issue of issues) {
    const icon = issue.severity === 'error' ? '❌' : '⚠️';
    console.log(`  ${icon} [${issue.type}] ${issue.message}`);
  }

  console.log(`\n  ${errors.length} error(s), ${warnings.length} warning(s)\n`);

  if (errors.length > 0) process.exit(1);
}

if (require.main === module) { main().catch(console.error); }

module.exports = { validate, EMOJI_REGEX, MIN_FONT_SIZE };
