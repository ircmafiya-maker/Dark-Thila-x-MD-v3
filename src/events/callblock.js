export default function callBlock(sock) {
  sock.ev.on('call', async (calls) => {
    for (const call of calls || []) {
      if (call?.status !== 'offer') continue;
      try {
        await sock.rejectCall(call.id, call.from);
        await sock.sendMessage(call.from, { text: '📵 Bot ekata call karanna ba. Commands use karanna.' });
      } catch (_) {}
    }
  });
}
