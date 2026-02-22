#!/usr/bin/env node
/**
 * Remove historical U.S. presidents from data/politicians_import_ready.json.
 * Keeps only active politicians (current senators, reps, governors, etc.).
 *
 * Run: node scripts/remove_historical_presidents.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '..', 'data', 'politicians_import_ready.json');

const HISTORICAL_PRESIDENT_SLUGS = new Set([
  'abraham-lincoln', 'john-adams', 'thomas-jefferson', 'james-madison', 'james-monroe',
  'john-quincy-adams', 'andrew-jackson', 'martin-van-buren', 'william-henry-harrison',
  'john-tyler', 'james-k-polk', 'zachary-taylor', 'millard-fillmore', 'franklin-pierce',
  'james-buchanan', 'andrew-johnson', 'ulysses-s-grant', 'rutherford-b-hayes', 'james-a-garfield',
  'chester-a-arthur', 'grover-cleveland', 'benjamin-harrison', 'william-mckinley', 'theodore-roosevelt',
  'william-howard-taft', 'woodrow-wilson', 'warren-g-harding', 'calvin-coolidge', 'herbert-hoover',
  'franklin-d-roosevelt', 'harry-s-truman', 'dwight-d-eisenhower', 'john-f-kennedy', 'lyndon-b-johnson',
  'richard-nixon', 'gerald-ford', 'jimmy-carter-2', 'ronald-reagan',
]);

const WHITEHOUSE_PRESIDENTS_URL = 'whitehouse.gov/about-the-white-house/presidents/';

function isHistoricalPresident(record) {
  const url = record.website_url || '';
  if (url.includes(WHITEHOUSE_PRESIDENTS_URL)) return true;
  if (record.slug && HISTORICAL_PRESIDENT_SLUGS.has(record.slug)) return true;
  return false;
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
const before = data.length;
const filtered = data.filter((r) => !isHistoricalPresident(r));
const removed = before - filtered.length;

fs.writeFileSync(dataPath, JSON.stringify(filtered, null, 2), 'utf-8');
console.log(`Removed ${removed} historical presidents from data/politicians_import_ready.json`);
console.log(`Remaining: ${filtered.length} politicians`);
