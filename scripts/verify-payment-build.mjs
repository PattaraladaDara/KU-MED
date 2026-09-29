import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const marker = 'cash-v2';
const base = process.argv[2];
if (base) {
  const page = await fetch(new URL('/patients/build-check', base), {cache:'no-store'});
  if (!page.ok) throw new Error(`Patient page returned HTTP ${page.status}`);
  const html = await page.text();
  const scripts = [...new Set([...html.matchAll(/src="([^" ]+\.js[^" ]*)"/g)].map(match=>match[1]))];
  let found = false;
  for (const path of scripts) {
    const response = await fetch(new URL(path.replaceAll('&amp;', '&'), base), {cache:'no-store'});
    if (!response.ok) throw new Error(`Missing JavaScript: ${path} (${response.status})`);
    if ((await response.text()).includes(marker)) found = true;
  }
  if (!found) throw new Error('The running patient page does not serve cash-v2. Deployment is not verified.');
  console.log('PASS: Running patient page serves cash-v2 (cash received, change and receipt controls).');
} else {
  const root = resolve('.next/static/chunks');
  const files = await readdir(root, {recursive:true});
  let found = false;
  for (const file of files.filter(file=>file.endsWith('.js'))) {
    if ((await readFile(resolve(root,file),'utf8')).includes(marker)) found = true;
  }
  if (!found) throw new Error('cash-v2 is missing from the compiled browser JavaScript.');
  console.log('PASS: cash-v2 exists in compiled browser JavaScript.');
}
