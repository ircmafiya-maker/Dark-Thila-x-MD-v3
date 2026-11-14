import { makeLinkCommand } from '../lib/linkCommand.js';

export default makeLinkCommand({
  name: 'tw',
  aliases: ['twdl', 'twitter', 'x'],
  label: 'Twitter / X',
  emoji: '🐦',
  hosts: ['twitter.com', 'x.com', 't.co'],
  maxHeight: 720,
});
