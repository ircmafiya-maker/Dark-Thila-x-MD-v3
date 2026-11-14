import { makeLinkCommand } from '../lib/linkCommand.js';

export default makeLinkCommand({
  name: 'fb',
  aliases: ['fbdl', 'facebook'],
  label: 'Facebook',
  emoji: '📘',
  hosts: ['facebook.com', 'fb.watch', 'fb.com'],
  maxHeight: 720,
});
