#!/usr/bin/env node
/**
 * Remove media sources and platform entries from data/politicians_import_ready.json.
 * Keeps only real politicians (senators, representatives, governors).
 * Run once: node scripts/removeMediaFromPoliticiansData.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const dataPath = path.join(projectRoot, 'data', 'politicians_import_ready.json');

const MEDIA_PARTY = 'Media';
const PLATFORM_NAMES = new Set([
  'Facebook', 'YouTube', 'TikTok', 'WeChat', 'Reddit', 'Weibo', 'Quora', 'Tumblr',
  'Truth Social', 'Tribel', 'Spill', 'Facebook,', 'YouTube,', 'TikTok,'
]);

function isMediaOrPlatform(entry) {
  if (entry.political_party === MEDIA_PARTY) return true;
  const name = (entry.name || '').trim();
  if (PLATFORM_NAMES.has(name)) return true;
  if (/\.(com|org|net|co\.uk)(\s|$)/i.test(name)) return true;
  const slug = (entry.slug || '').toLowerCase();
  if (slug.endsWith('-com') || slug.includes('-co-uk') || slug.includes('-com-')) return true;
  if (['facebook', 'youtube', 'tiktok', 'wechat', 'reddit', 'weibo', 'quora', 'tumblr', 'truth-social', 'tribel', 'spill'].includes(slug)) return true;
  return false;
}

const raw = fs.readFileSync(dataPath, 'utf-8');
const data = JSON.parse(raw);
const before = data.length;
const cleaned = data.filter((entry) => !isMediaOrPlatform(entry));
const removed = before - cleaned.length;

fs.writeFileSync(dataPath, JSON.stringify(cleaned, null, 2), 'utf-8');
console.log(`Removed ${removed} media/platform entries. Before: ${before}, after: ${cleaned.length}.`);
