#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '../src');

const ALIAS_MAP = [
  // Order matters: more specific first to avoid partial replacements
  ['../context/', '@context/'],
  ['../../context/', '@context/'],
  ['../../../context/', '@context/'],
  ['../components/', '@components/'],
  ['../../components/', '@components/'],
  ['../../../components/', '@components/'],
  ['../services/', '@services/'],
  ['../../services/', '@services/'],
  ['../../../services/', '@services/'],
  ['../data/', '@data/'],
  ['../../data/', '@data/'],
  ['../../../data/', '@data/'],
  ['../hooks/', '@hooks/'],
  ['../../hooks/', '@hooks/'],
  ['../../../hooks/', '@hooks/'],
  ['../utils/', '@utils/'],
  ['../../utils/', '@utils/'],
  ['../../../utils/', '@utils/'],
  ['../pages/', '@pages/'],
  ['../../pages/', '@pages/'],
  ['../../../pages/', '@pages/'],
  ['../lib/', '@lib/'],
  ['../../lib/', '@lib/'],
  ['../../../lib/', '@lib/'],
];

function getAllFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...getAllFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      result.push(full);
    }
  }
  return result;
}

let totalReplacements = 0;
let filesChanged = 0;

for (const file of getAllFiles(srcDir)) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  for (const [from, to] of ALIAS_MAP) {
    // Match: 'from' or "from"
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(['"])${escaped}`, 'g');

    if (regex.test(content)) {
      const newContent = content.replace(
        new RegExp(`(['"])${escaped}`, 'g'),
        `$1${to}`
      );
      if (newContent !== content) {
        content = newContent;
        changed = true;
        totalReplacements++;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    filesChanged++;
    console.log(`✓ ${path.relative(srcDir, file)}`);
  }
}

console.log(`\n✓ Done. Updated ${filesChanged} files (${totalReplacements} replacements).`);
