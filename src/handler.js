import { jidNormalizedUser } from '@whiskeysockets/baileys';
import { config } from './config.js';
import { getText, isGroup, digits, isAdmin, getContextInfo } from './lib/utils.js';
import { addXp, rankBadge } from './lib/xp.js';
import { commands, findCommand } from './commands/index.js';

/** Every phone-number / LID form WhatsApp gave us for this message's author. */
const senderIds = (msg, sender) =>
  [sender, msg.key.participantAlt, msg.key.remoteJidAlt, msg.participant].filter(Boolean).map(digits).filter(Boolean);

export async function handleMessage(sock, msg) {
  const jid = msg.key.remoteJid;
  if (!jid || jid === 'status@broadcast' || jid.endsWith('@newsletter')) return;

  const group = isGroup(jid);
  const fromMe = !!msg.key.fromMe;
  const sender = group
    ? msg.key.participant || msg.participant || (fromMe && sock.user?.id ? jidNormalizedUser(sock.user.id) : undefined)
    : jid;
  const text = getText(msg.message).trim();
  const senderDigits = digits(sender);
  // owner = the bot's own number, or OWNER_NUMBER (checked against @lid *and* phone-number forms)
  const isOwner = fromMe || (!!config.ownerNumber && senderIds(msg, sender).includes(config.ownerNumber));

  // XP for group chat
  if (group && !fromMe && sender) {
    addXp(jid, sender)
      .then((r) => {
        if (r?.leveled) {
          return sock.sendMessage(jid, {
            text: `🎉 @${senderDigits} level up → *${r.newLevel}* ${rankBadge(r.newLevel)}`,
            mentions: [sender],
          });
        }
      })
      .catch(() => {});
  }

  if (!text.startsWith(config.prefix)) return;
  const body = text.slice(config.prefix.length).trim();
  const [name = '', ...args] = body.split(/\s+/);
  const cmd = findCommand(name.toLowerCase());
  if (!cmd) return;
  // raw text after the command name, line breaks kept (for .setwelcome, .hidetag...)
  const argText = body.slice(name.length).trim();

  const reply = (t, extra = {}) => sock.sendMessage(jid, { text: t, ...extra }, { quoted: msg });

  if (config.mode === 'private' && !isOwner) return;
  if (cmd.owner && !isOwner) return reply('⛔ Owner only command.');
  if (cmd.group && !group) return reply('⚠️ Group ekak athule witharai use karanna puluwan.');

  // permission checks FAIL CLOSED: if WhatsApp can't tell us, a normal member must not get admin powers
  const senderIsAdmin = group ? await isAdmin(sock, jid, sender, { failOpen: false }) : false;
  if (cmd.admin && !isOwner && !senderIsAdmin) return reply('⛔ Admins witharai.');

  const ctxInfo = getContextInfo(msg.message);
  const ctx = {
    sock, msg, jid, sender, text, args, argText, isGroup: group,
    isOwner, isAdmin: senderIsAdmin, fromMe,
    prefix: config.prefix, config, commands, reply,
    react: (emoji) => sock.sendMessage(jid, { react: { text: emoji, key: msg.key } }).catch(() => {}),
    ctxInfo,
    mentioned: ctxInfo?.mentionedJid || [],
    quotedSender: ctxInfo?.participant,
    quotedText: (() => { const q = ctxInfo?.quotedMessage; return q ? getText(q) : ''; })(),
  };

  try {
    await cmd.run(ctx);
  } catch (err) {
    console.error(`[cmd:${cmd.name}]`, err);
    reply('❌ Command eka fail una. Ayeth try karanna.').catch(() => {});
  }
}
