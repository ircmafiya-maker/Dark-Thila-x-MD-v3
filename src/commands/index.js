import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));

/** name -> command. Every other .js file in this folder is auto-loaded. */
export const commands = new Map();
const aliasMap = new Map();

for (const file of fs.readdirSync(dir)) {
  if (file === 'index.js' || !file.endsWith('.js')) continue;
  const mod = await import(pathToFileURL(path.join(dir, file)).href);
  const cmd = mod.default;
  if (!cmd?.name || typeof cmd.run !== 'function') {
    console.warn(`[commands] skipped ${file} (needs default export with name + run)`);
    continue;
  }
  commands.set(cmd.name, cmd);
  for (const a of cmd.aliases || []) aliasMap.set(a, cmd.name);
}

export const findCommand = (name) => commands.get(name) || commands.get(aliasMap.get(name));
console.log(`[commands] loaded ${commands.size} commands`);
