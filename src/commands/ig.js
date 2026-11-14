import { makeLinkCommand } from '../lib/linkCommand.js';

// Instagram often needs login for some posts. Put a cookies.txt in the project root to improve success.
export default makeLinkCommand({
  name: 'ig',
  aliases: ['igdl', 'instagram'],
  label: 'Instagram',
  emoji: '📸',
  hosts: ['instagram.com', 'instagr.am'],
  maxHeight: 720,
});
