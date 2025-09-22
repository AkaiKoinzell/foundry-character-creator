#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const INDEX_FILE = path.resolve('data', 'races.json');
const DATA_FILE = path.resolve('data', 'races', 'races-new.json');
const OUTPUT_DIR = path.resolve('data', 'races');
const SPELLJAMMER_SOURCE = 'AAG';

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/(^-|-$)/g, '');
}

function loadJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function saveJson(file, data) {
  writeFileSync(file, `${JSON.stringify(data, null, '\t')}\n`, 'utf8');
}

const index = loadJson(INDEX_FILE);
index.items = index.items || {};
const existingNames = new Set(Object.keys(index.items));
const racesData = loadJson(DATA_FILE);
const additions = [];

for (const race of racesData.race || []) {
  if (race.source !== SPELLJAMMER_SOURCE) continue;
  if (!race.name) continue;
  if (existingNames.has(race.name)) continue;
  const slug = slugify(race.name);
  const fileName = `${slug}.json`;
  const outputPath = path.join(OUTPUT_DIR, fileName);
  if (existsSync(outputPath)) continue;
  saveJson(outputPath, race);
  index.items[race.name] = `data/races/${fileName}`;
  additions.push(race.name);
}

if (!additions.length) {
  console.log('No new Spelljammer races were added.');
  process.exit(0);
}

const sortedItems = Object.keys(index.items)
  .sort((a, b) => a.localeCompare(b))
  .reduce((acc, key) => {
    acc[key] = index.items[key];
    return acc;
  }, {});

index.items = sortedItems;

saveJson(INDEX_FILE, index);
console.log(`Added ${additions.length} Spelljammer races: ${additions.join(', ')}`);
