// deploy-functions.mjs
// Faz o deploy das Edge Functions via Supabase Management API
// node deploy-functions.mjs <PERSONAL_ACCESS_TOKEN>

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAT = process.argv[2];
const PROJECT_REF = 'pspkpqwfkgpsjgerxogm';

if (!PAT) {
  console.error('Uso: node deploy-functions.mjs <PERSONAL_ACCESS_TOKEN>');
  process.exit(1);
}

const functions = [
  { slug: 'tracking-script',  path: 'supabase/functions/tracking-script/index.ts',  verify_jwt: false },
  { slug: 'tracking-collect', path: 'supabase/functions/tracking-collect/index.ts', verify_jwt: false },
  { slug: 'capi-dispatch',    path: 'supabase/functions/capi-dispatch/index.ts',    verify_jwt: false },
  { slug: 'sales-webhook',    path: 'supabase/functions/sales-webhook/index.ts',    verify_jwt: false },
];

async function deployFunction(fn) {
  const body = readFileSync(join(__dirname, fn.path), 'utf8');

  // Tentar PATCH primeiro (atualizar existente), depois POST (criar)
  for (const method of ['PATCH', 'POST']) {
    const url = method === 'PATCH'
      ? `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${fn.slug}`
      : `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`;

    const payload = {
      slug: fn.slug,
      name: fn.slug,
      body,
      verify_jwt: fn.verify_jwt,
    };

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    if (res.ok) {
      console.log(`✅ ${fn.slug} (${method}) — ${res.status}`);
      return true;
    }

    if (method === 'PATCH' && (res.status === 404 || res.status === 400)) {
      // Não existe ainda — vai tentar POST
      continue;
    }

    console.error(`❌ ${fn.slug} (${method}) — ${res.status}: ${text.slice(0, 200)}`);
    return false;
  }
}

console.log(`🚀 Deployando ${functions.length} Edge Functions no projeto ${PROJECT_REF}...\n`);

for (const fn of functions) {
  await deployFunction(fn);
}

console.log('\n✅ Deploy concluído! Teste o evento novamente no TrackingHub.');
