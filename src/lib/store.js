import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { serialize } from './utils.js';

/** Tiny JSON-file store: data/<name>.json */
const file = (name) => {
  fs.mkdirSync(config.dataDir, { recursive: true });
  return path.join(config.dataDir, `${name}.json`);
};

export const readJson = (name, fallback = {}) => {
  try {
    const f = file(name);
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (_) {}
  return fallback;
};

export const writeJson = (name, data) => {
  try { fs.writeFileSync(file(name), JSON.stringify(data, null, 2)); } catch (_) {}
};

/** Safe read-modify-write (serialized per name). */
export const updateJson = (name, mutate, fallback = {}) =>
  serialize(`store:${name}`, async () => {
    const data = readJson(name, fallback);
    const out = (await mutate(data)) ?? data;
    writeJson(name, out);
    return out;
  });
