require('dotenv').config({ path: ['.env.local', '.env'] });

const { spawnSync } = require('child_process');

const result = spawnSync(
  process.execPath,
  [require.resolve('prisma'), ...process.argv.slice(2)],
  { stdio: 'inherit', env: process.env }
);

if (result.error) throw result.error;
process.exitCode = result.status === null ? 1 : result.status;
