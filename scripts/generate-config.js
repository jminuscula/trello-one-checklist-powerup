const fs = require('node:fs');

const appKey = process.env.TRELLO_POWER_UP_KEY;
if (!appKey) throw new Error('Missing TRELLO_POWER_UP_KEY environment variable.');

const config = `window.APP_CONFIG = ${JSON.stringify({
  appKey,
  appName: 'Checklist Overview',
  appAuthor: 'Personal Power-Up'
}, null, 2)};\n`;

fs.writeFileSync('config.js', config, 'utf8');
console.log('Generated config.js from TRELLO_POWER_UP_KEY.');
