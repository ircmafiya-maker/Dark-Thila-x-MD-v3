import util from 'util';
import { currentSid } from './context.js';

/** Platform-wide live state (the per-number state lives in src/connection.js sessions). */
export const runtime = {
  startedAt: Date.now(),
  storage: 'sqlite',
  logs: [],
};

// Keep the last 600 console lines (tagged with the session that wrote them).
// The admin panel sees all lines, a user's dashboard only sees their own.
const MAX_LOGS = 600;
for (const level of ['log', 'warn', 'error']) {
  const orig = console[level].bind(console);
  console[level] = (...args) => {
    orig(...args);
    runtime.logs.push({ t: Date.now(), level, sid: currentSid(), line: util.format(...args).slice(0, 1500) });
    if (runtime.logs.length > MAX_LOGS) runtime.logs.shift();
  };
}
