// Tests d'intégration Postgres locaux via embedded-postgres (binaires npm officiels).
// Usage : npm run test:pg:local
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';

const PGPORT = 5442;
const pg = new EmbeddedPostgres({
  user: 'recovai',
  password: 'recovai_test',
  database: 'recovai',
  port: PGPORT,
  persistent: false,
  onLog: () => {},
});

try {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('recovai').catch(() => {});

  const env = { ...process.env, DATABASE_URL: `postgres://recovai:recovai_test@127.0.0.1:${PGPORT}/recovai` };
  const mig = spawnSync('node', ['scripts/migrate-pg.mjs'], { stdio: 'inherit', env });
  if (mig.status !== 0) throw new Error('Échec des migrations');

  const tests = spawnSync('npx', ['vitest', 'run', 'server/repo.pg.test.ts'], { stdio: 'inherit', env });
  process.exitCode = tests.status ?? 1;
} finally {
  await pg.stop().catch(() => {});
}
