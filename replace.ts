import fs from 'fs';
import path from 'path';

function walk(dir: string, callback: (file: string) => void) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      walk(full, callback);
    } else if (full.endsWith('.tsx')) {
      callback(full);
    }
  }
}

walk('src', (file) => {
  let content = fs.readFileSync(file, 'utf-8');
  const initial = content;
  content = content.replace(/style=\{\{\s*fontFamily:\s*["']'Syne'[^"']*["']\s*\}\}/g, '');
  content = content.replace(/style=\{\{\s*fontFamily:\s*["']'Syne'[^"']*["'],\s*(.*?)\}\}/g, 'style={{$1}}');
  if (content !== initial) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});
