import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const html = await readFile('public/index.html', 'utf8');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
const links = [...new Set([...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map(match => match[1]))];
const external = [];
for (const link of links) {
  if (link.startsWith('#')) assert(ids.has(link.slice(1)), `Missing anchor: ${link}`);
  else if (link.startsWith('https:')) external.push(link);
  else if (!link.startsWith('mailto:')) await access(resolve('public', link));
}
console.log('PASS: all internal anchors and local asset paths exist.');
if (process.argv.includes('--external')) {
  for (const url of external) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      console.log(`${response.status} ${url}`);
      await response.body?.cancel();
    } catch (error) {
      console.log(`UNVERIFIED ${url}: ${error.message}`);
    }
  }
}
