/** Max N downloads at once (keeps small Render instances from running out of RAM). */
const MAX = Number(process.env.MAX_DOWNLOADS) || 2;
let running = 0;
const waiting = [];

export async function withLimit(fn) {
  if (running >= MAX) await new Promise((r) => waiting.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}
