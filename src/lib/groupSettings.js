import path from 'path';
import { readJson, updateJson } from './store.js';
import { config } from '../config.js';

const file = (jid) => `group-${jid.replace(/[^a-zA-Z0-9]/g, '_')}`;

const defaults = () => ({
  antilink: false,
  antiflood: false,
  warnLimit: 3,
  warns: {},   // digits -> count
  muted: [],   // digits
  welcomeOn: false,
  welcome: '',
  goodbye: '',
  welcomeImg: false,
  goodbyeImg: false,
});

export const getGroup = (jid) => ({ ...defaults(), ...readJson(file(jid)) });

/** Safe read-modify-write: mutate(d) may change d in place. */
export const updateGroup = (jid, mutate) =>
  updateJson(file(jid), (d) => {
    const merged = { ...defaults(), ...d };
    mutate(merged);
    return merged;
  });

/** Where a group's welcome/goodbye picture lives. kind = 'welcome' | 'goodbye' */
export const imgPath = (jid, kind) =>
  path.join(config.dataDir, `img-${jid.replace(/[^a-zA-Z0-9]/g, '_')}-${kind}.jpg`);
