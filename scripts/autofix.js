#!/usr/bin/env node
/**
 * autofix.js — Mechanical fixes for .drawio files
 * Grid snap, hex case, arcSize, strokeWidth, fontFamily normalization, emoji strip
 * Usage: node autofix.js [--write] <file.drawio>
 */

const fs = require('fs');
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{FE00}-\u{FE0F}\u{200D}]/gu;

function autofix(content) {
  let fixed = content;
  const changes = [];

  // 1. absoluteArcSize=1 next to every arcSize
  const arcFix = fixed.replace(/(arcSize=\d+)(?!.*absoluteArcSize)/g, '$1;absoluteArcSize=1');
  if (arcFix !== fixed) { changes.push('+absoluteArcSize=1'); fixed = arcFix; }

  // 2. Hex case normalization (lowercase for consistency)
  const hexFix = fixed.replace(/(#[0-9A-Fa-f]{6})/g, (m) => m.toUpperCase());
  if (hexFix !== fixed && hexFix.match(/#[A-F0-9]{6}/g)?.length !== fixed.match(/#[a-f0-9]{6}/g)?.length) {
    // Only report if we actually changed something to uppercase
  }
  fixed = hexFix;

  // 3. fontFamily normalization on new labels
  // Add fontFamily if missing on vertex cells with value
  fixed = fixed.replace(
    /(<mxCell\s[^>]*?\bvertex="1"[^>]*?\bvalue="[^"]+"[^>]*?\bstyle=")((?!.*fontFamily=).*)(")/g,
    (match, before, style, after) => {
      const chinese = /[一-鿿]/.test(match);
      const font = chinese ? 'Microsoft YaHei' : 'Arial';
      return `${before}${style};fontFamily=${font}${after}`;
    }
  );

  // 4. Grid snap — round x, y, width, height to nearest 10
  fixed = fixed.replace(
    /(x|y|width|height)="(\d+(?:\.\d+)?)"/g,
    (match, attr, val) => {
      const rounded = Math.round(parseFloat(val) / 10) * 10;
      if (Math.abs(rounded - parseFloat(val)) > 0.01) {
        changes.push(`snap ${attr}=${val} → ${rounded}`);
      }
      return `${attr}="${rounded}"`;
    }
  );

  // 5. strokeWidth normalization on edges — force 1.5pt
  fixed = fixed.replace(
    /(<mxCell\s[^>]*?\bedge="1"[^>]*?\bstyle="[^"]*?strokeWidth=)(\d+(?:\.\d+)?)/g,
    (match, before, val) => {
      if (parseFloat(val) !== 1.5) {
        changes.push(`edge strokeWidth ${val} → 1.5`);
        return `${before}1.5`;
      }
      return match;
    }
  );

  // 6. Strip emoji from labels
  fixed = fixed.replace(/value="([^"]*)"/g, (match, value) => {
    if (EMOJI_REGEX.test(value)) {
      const stripped = value.replace(EMOJI_REGEX, '').replace(/\s+/g, ' ').trim();
      changes.push(`strip emoji: "${value}" → "${stripped}"`);
      return `value="${stripped}"`;
    }
    return match;
  });

  return { content: fixed, changes };
}

async function main() {
  const args = process.argv.slice(2);
  const writeIdx = args.indexOf('--write');
  const write = writeIdx > -1;
  const input = args.find(a => a.endsWith('.drawio'));

  if (!input) { console.log('Usage: node autofix.js [--write] <file.drawio>'); process.exit(1); }
  if (!fs.existsSync(input)) { console.error(`File not found: ${input}`); process.exit(1); }

  const original = fs.readFileSync(input, 'utf8');
  const { content, changes } = autofix(original);

  console.log(`\nAutofix: ${input}\n`);
  if (changes.length === 0) {
    console.log('  ✅ No fixes needed.\n');
  } else {
    for (const c of changes) console.log(`  🔧 ${c}`);
    console.log(`\n  ${changes.length} fix(es) applied.\n`);
    if (write) {
      fs.writeFileSync(input, content, 'utf8');
      console.log('  File updated (--write).\n');
    } else {
      console.log('  Dry run. Use --write to apply changes.\n');
    }
  }
}

if (require.main === module) { main().catch(console.error); }
module.exports = { autofix };
