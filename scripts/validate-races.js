#!/usr/bin/env node
import { readdirSync, readFileSync } from 'fs';
import path from 'path';

const racesDir = path.resolve('data', 'races');
let hasError = false;

function hasSelectionMeta(value) {
  if (!value) return false;
  if (Array.isArray(value)) {
    return value.some(v => hasSelectionMeta(v));
  }
  if (typeof value === 'object') {
    if ('choose' in value) return true;
    return Object.keys(value).some(k => /^any/i.test(k) || hasSelectionMeta(value[k]));
  }
  return false;
}

function checkField(value) {
  if (!Array.isArray(value)) return false;
  if (value.length <= 1) return false;
  if (hasSelectionMeta(value)) return false;
  return true;
}

for (const file of readdirSync(racesDir)) {
  if (!file.endsWith('.json')) continue;
  const filePath = path.join(racesDir, file);
  let race;
  try {
    race = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`Failed to parse ${file}: ${e.message}`);
    hasError = true;
    continue;
  }
  const issues = [];
  if (checkField(race.size)) issues.push('size');
  if (checkField(race.languageProficiencies)) issues.push('languageProficiencies');
  if (checkField(race.ability)) issues.push('ability');
  if (checkField(race.custom)) issues.push('custom');

  if (issues.length) {
    console.error(`${file} missing selection metadata for: ${issues.join(', ')}`);
    hasError = true;
  }
}

if (hasError) {
  console.error('Race validation failed.');
  process.exit(1);
} else {
  console.log('All race files passed validation.');
}
