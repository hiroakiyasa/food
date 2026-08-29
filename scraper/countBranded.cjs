const { createReadStream } = require('fs');
const { join } = require('path');

let count = 0;
let depth = 0;
let inStr = false;
let escape = false;

const stream = createReadStream(join(__dirname, '..', 'data', 'output', 'usda_branded_filtered.json'), { encoding: 'utf-8' });

stream.on('data', chunk => {
  for (let i = 0; i < chunk.length; i++) {
    const ch = chunk[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '[' || ch === '{') {
      depth++;
      if (ch === '{' && depth === 2) count++;
    }
    if (ch === ']' || ch === '}') depth--;
  }
});

stream.on('end', () => console.log('Branded items in file: ' + count));
