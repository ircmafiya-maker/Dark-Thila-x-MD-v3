import { config } from './config.js';
import { getText, isGroup, digits, isAdmin, getContextInfo } from './lib/utils.js';
import { addXp, rankBadge } from './lib/xp.js';
import { commands, findCommand } from './commands/index.js';
import { getSession } from './lib/context.js';

export async function handleMessage(sock, msg) {
  const jid = msg.key.remoteJid;
  if (!jid || jid === 'status@broadcast' || jid.endsWith('@newsletter')) return;

  const group = isGroup(jid);
  const sender = group ? (msg.key.participant || msg.participant) : jid;
  const fromMe = !!msg.key.fromMe;
  const text = getText(msg.message).trim();
  const senderDigits = digits(sender);
  const session = getSession();
  // per-session settings (mode/prefix are changed from the dashboard or with .mode)
  const settings = session?.settings || { mode: config.mode, prefix: config.prefix };
  const isOwner =
    fromMe ||
    (!!config.ownerNumber && senderDigits === config.ownerNumber && (config.ownerSudo || !!session?.legacy));

  // XP for group chat
  if (group && !fromMe && sender) {
    addXp(jid, sender)
      .then((r) => {
        if (r?.leveled) {
          sock.sendMessage(jid, {
            text: `🎉 @${senderDigits} level up → *${r.newLevel}* ${rankBadge(r.newLevel)}`,
            mentions: [sender],
          });
        }
      })
      .catch(() => {});
  }

  if (!text.startsWith(settings.prefix)) return;
  const [name, ...args] = text.slice(settings.prefix.length).trim().split(/\s+/);
  const cmd = findCommand(name.toLowerCase());
  if (!cmd) return;

  const reply = (t, extra = {}) => sock.sendMessage(jid, { text: t, ...extra }, { quoted: msg });

  if (settings.mode === 'private' && !isOwner) return;
  if (cmd.owner && !isOwner) return reply('⛔ Owner only command.');
  if (cmd.group && !group) return reply('⚠️ Group ekak athule witharai use karanna puluwan.');

  const senderIsAdmin = group ? await isAdmin(sock, jid, sender) : false;
  if (cmd.admin && !isOwner && !senderIsAdmin) return reply('⛔ Admins witharai.');

  const ctxInfo = getContextInfo(msg.message);
  const ctx = {
    sock, msg, jid, sender, text, args, isGroup: group,
    isOwner, isAdmin: senderIsAdmin, fromMe,
    prefix: settings.prefix, config, commands, reply, settings, session,
    react: (emoji) => sock.sendMessage(jid, { react: { text: emoji, key: msg.key } }),
    ctxInfo,
    mentioned: ctxInfo?.mentionedJid || [],
    quotedSender: ctxInfo?.participant,
    quotedText: (() => { const q = ctxInfo?.quotedMessage; return q ? getText(q) : ''; })(),
  };

  try {
    await cmd.run(ctx);
  } catch (err) {
    console.error(`[cmd:${cmd.name}]`, err);
    reply('❌ Command eka fail una. Ayeth try karanna.');
  }
}
