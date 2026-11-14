import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const modules = [];

for (const file of fs.readdirSync(dir)) {
  if (file === 'index.js' || !file.endsWith('.js')) continue;
  const mod = await import(pathToFileURL(path.join(dir, file)).href);
  if (typeof mod.default === 'function') modules.push(mod.default);
}

/** Each file in src/events exports default (sock) => { sock.ev.on(...) } */
export const registerEvents = (sock) => modules.forEach((fn) => fn(sock));
