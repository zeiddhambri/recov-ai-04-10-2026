// Applique les migrations SQL de server/db/migrations dans l'ordre alphabétique.
// Usage : DATABASE_URL=postgres://... node scripts/migrate-pg.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const url = (process.env.DATABASE_URL || '').trim();
if (!url || url === '0000' || !/^postgres(ql)?:\/\/.+/i.test(url)) {
  console.warn('[migrate] DATABASE_URL non configuré ou non valide, migration ignorée');
  process.exit(0);
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server', 'db', 'migrations');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

const client = new pg.Client({ connectionString: url });
await client.connect();
for (const file of files) {
  const sql = fs.readFileSync(path.join(dir, file), 'utf-8');
  process.stdout.write(`[migrate] ${file} ... `);
  await client.query(sql); // simple protocol: gère les multi-statements, $$ et BEGIN/COMMIT
  console.log('ok');
}
await client.end();
