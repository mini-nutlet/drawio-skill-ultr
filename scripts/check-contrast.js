#!/usr/bin/env node
/**
 * check-contrast.js — WCAG 2.1 AA contrast ratio checker
 * Usage: node check-contrast.js <theme.json>
 *        node check-contrast.js --all
 */

const fs = require('fs');
const path = require('path');
const THEMES_DIR = path.join(__dirname, '..', 'assets', 'themes');

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function relativeLuminance([r, g, b]) {
  const toSRGB = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toSRGB(r) + 0.7152 * toSRGB(g) + 0.0722 * toSRGB(b);
}

function contrastRatio(hex1, hex2) {
  if (!hex1 || !hex2 || !hex1.startsWith('#') || !hex2.startsWith('#')) return null;
  const lum1 = relativeLuminance(hexToRgb(hex1));
  const lum2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function checkTheme(themePath) {
  const theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));
  const results = [];
  const semantic = theme.colors?.semantic || {};

  for (const [role, colors] of Object.entries(semantic)) {
    if (!colors.fill || !colors.text) continue;
    const ratio = contrastRatio(colors.text, colors.fill);
    const pass = ratio >= 4.5;
    results.push({ role, fill: colors.fill, text: colors.text, ratio: ratio?.toFixed(1), pass });
  }

  // Check edge colors against page background
  const bg = theme.colors?.pageBackground;
  if (bg && theme.colors?.edge?.default) {
    const edgeRatio = contrastRatio(theme.colors.edge.default, bg);
    results.push({ role: 'edge-default', fill: bg, text: theme.colors.edge.default, ratio: edgeRatio?.toFixed(1), pass: edgeRatio >= 3.0 });
  }

  return { theme: path.basename(themePath), results };
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--all')) {
    const files = fs.readdirSync(THEMES_DIR).filter(f => f.endsWith('.json'));
    let allPass = true;
    for (const f of files) {
      const { theme, results } = checkTheme(path.join(THEMES_DIR, f));
      console.log(`\n${theme}:`);
      for (const r of results) {
        console.log(`  ${r.pass ? '✅' : '❌'} ${r.role.padEnd(16)} ${r.fill} / ${r.text} → ${r.ratio}:1`);
        if (!r.pass) allPass = false;
      }
    }
    console.log(`\n${allPass ? '✅ All themes pass WCAG AA' : '❌ Some themes fail WCAG AA'}\n`);
    process.exit(allPass ? 0 : 1);
  }

  const input = args[0];
  if (!input) { console.log('Usage: node check-contrast.js <theme.json> | --all'); process.exit(1); }
  const { theme, results } = checkTheme(input);
  console.log(`\n${theme}:`);
  for (const r of results) {
    console.log(`  ${r.pass ? '✅' : '❌'} ${r.role.padEnd(16)} ${r.fill} / ${r.text} → ${r.ratio}:1`);
  }
}

if (require.main === module) { main().catch(console.error); }
module.exports = { checkTheme, contrastRatio };
