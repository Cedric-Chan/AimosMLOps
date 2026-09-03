import fs from 'fs';
const t = fs.readFileSync(new URL('./src/app/App.tsx', import.meta.url), 'utf8');
const start = t.indexOf('const ALL_DATA');
const sub = t.slice(start);
const eq = sub.indexOf('=');
const arrStart = sub.indexOf('[', eq);
let depth = 0;
let end = -1;
for (let i = arrStart; i < sub.length; i++) {
  if (sub[i] === '[') depth++;
  if (sub[i] === ']') {
    depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}
const arrStr = sub.slice(arrStart, end);
fs.writeFileSync(new URL('./all-data.json', import.meta.url), arrStr);
