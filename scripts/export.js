#!/usr/bin/env node
/**
 * export.js — draw.io Desktop CLI wrapper for SVG/PNG/JPEG/PDF export
 * Requires: draw.io Desktop CLI (brew install --cask drawio)
 * Usage:
 *   node export.js input.drawio -f svg -o output.svg
 *   node export.js input.drawio --all -o output/
 *   node export.js --batch ./diagrams/ --all -o ./exported/
 */

const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findDrawioBinary() {
  const candidates = [
    'drawio',                                                            // macOS Homebrew / Linux PATH
    '/Applications/draw.io.app/Contents/MacOS/draw.io',                  // macOS .app
    'C:\\Program Files\\draw.io\\draw.io.exe',                           // Windows
    '/usr/bin/drawio',                                                   // Linux
    '/snap/bin/drawio',                                                  // Linux snap
    '/mnt/c/Program Files/draw.io/draw.io.exe',                          // WSL2
  ];
  for (const bin of candidates) {
    try { execSync(`"${bin}" --version`, { stdio: 'pipe' }); return bin; }
    catch (e) { /* continue */ }
  }
  return null;
}

async function exportDiagram(inputPath, options = {}) {
  const { format, width, quality, embed, outputPath, border = 10 } = options;
  const drawioBin = findDrawioBinary();

  if (!drawioBin) {
    throw new Error(
      'draw.io Desktop CLI not found. All exports require Desktop.\n' +
      'Install: brew install --cask drawio (macOS)\n' +
      '         https://github.com/jgraph/drawio-desktop/releases (Windows/Linux)'
    );
  }

  const baseArgs = ['-x', '-f', format, '-b', String(border)];

  switch (format) {
    case 'svg':
      await execDrawio(drawioBin, [...baseArgs,
        embed ? '-e' : '', '-o', outputPath, inputPath].filter(Boolean));
      break;

    case 'png':
      await execDrawio(drawioBin, [...baseArgs,
        '--width', String(width || 2000),
        embed ? '-e' : '', '-o', outputPath, inputPath].filter(Boolean));
      if (embed) await repairPNG(outputPath);
      break;

    case 'jpg':
    case 'jpeg':
      await execDrawio(drawioBin, [...baseArgs,
        '--width', String(width || 1920), '--quality', String(quality || 92),
        '-o', outputPath, inputPath]);
      break;

    case 'pdf':
      await execDrawio(drawioBin, [...baseArgs,
        embed ? '-e' : '', '-o', outputPath, inputPath].filter(Boolean));
      break;
  }
}

async function execDrawio(bin, args) {
  const cleanArgs = args.filter(Boolean);
  console.log(`  ${bin} ${cleanArgs.join(' ')}`);
  execFileSync(bin, cleanArgs, { stdio: 'inherit' });
}

async function repairPNG(pngPath) {
  // draw.io CLI truncates IEND chunk in -e PNG output (8 bytes: type + CRC missing)
  // Append the missing bytes: 0x00 0x00 0x00 0x00 0x49 0x45 0x4E 0x44 0xAE 0x42 0x60 0x82
  const buf = fs.readFileSync(pngPath);
  if (buf.slice(-4).toString() !== 'IEND') {
    const IEND = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
    fs.writeFileSync(pngPath, Buffer.concat([buf, IEND]));
    console.log('  🔧 Repaired PNG IEND chunk');
  }
}

async function exportAll(inputPath, outputDir) {
  const basename = path.basename(inputPath, '.drawio');
  const formats = [
    { format: 'svg',  output: path.join(outputDir, `${basename}.svg`) },
    { format: 'png',  output: path.join(outputDir, `${basename}.drawio.png`), embed: true },
    { format: 'jpg',  output: path.join(outputDir, `${basename}_thumb.jpg`), width: 1920, quality: 92 },
    { format: 'pdf',  output: path.join(outputDir, `${basename}.pdf`), embed: true },
  ];
  for (const fmt of formats) {
    console.log(`\n  → ${fmt.format.toUpperCase()}: ${fmt.output}`);
    await exportDiagram(inputPath, fmt);
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--batch')) {
    const batchIdx = args.indexOf('--batch');
    const dir = args[batchIdx + 1];
    const all = args.includes('--all');
    const outIdx = args.indexOf('-o');
    const outDir = outIdx > -1 ? args[outIdx + 1] : dir;
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.drawio'));
    console.log(`Batch export: ${files.length} files from ${dir}/ → ${outDir}/\n`);
    for (const f of files) {
      const input = path.join(dir, f);
      if (all) { await exportAll(input, outDir); }
      else { await exportDiagram(input, { format: 'svg', outputPath: path.join(outDir, f.replace('.drawio', '.svg')) }); }
    }
    return;
  }

  if (args.includes('--all')) {
    const input = args.find(a => a.endsWith('.drawio'));
    const outIdx = args.indexOf('-o');
    const outDir = outIdx > -1 ? args[outIdx + 1] : '.';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    await exportAll(input, outDir);
    return;
  }

  const formatIdx = args.indexOf('-f');
  const format = formatIdx > -1 ? args[formatIdx + 1] : 'svg';
  const input = args.find(a => a.endsWith('.drawio'));
  const outIdx = args.indexOf('-o');
  const output = outIdx > -1 ? args[outIdx + 1] : `output.${format}`;
  const embed = args.includes('-e');
  const widthIdx = args.indexOf('--width');
  const width = widthIdx > -1 ? parseInt(args[widthIdx + 1]) : null;
  const qualityIdx = args.indexOf('--quality');
  const quality = qualityIdx > -1 ? parseInt(args[qualityIdx + 1]) : null;

  if (!input) { console.log('Usage: node export.js <input.drawio> -f svg|png|jpg|pdf [-e] [-o output] [--all]'); process.exit(1); }

  await exportDiagram(input, { format, width, quality, embed, outputPath: output });
  console.log(`\n✅ Exported: ${output}\n`);
}

if (require.main === module) { main().catch(err => { console.error(err.message); process.exit(1); }); }
