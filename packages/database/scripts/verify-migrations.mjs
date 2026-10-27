import { createTestDatabase } from './migrations.mjs';

const { db, files } = await createTestDatabase();
try {
  const tables = await db.query(`
    select table_name from information_schema.tables
    where table_schema = 'app' and table_type = 'BASE TABLE' order by table_name
  `);
  const unsecured = await db.query(`
    select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'app' and c.relkind = 'r' and not c.relrowsecurity
  `);
  if (unsecured.rows.length) throw new Error('An application table is missing row-level security');
  console.log(
    JSON.stringify(
      {
        engine: (await db.query('select version()')).rows[0].version,
        verification: 'Embedded PostgreSQL with test-only auth; not hosted deployment verification',
        migrations: files.map(({ name, sha256 }) => ({ name, sha256 })),
        tableCount: tables.rows.length,
        tables: tables.rows.map((row) => row.table_name),
        allApplicationTablesHaveRls: true,
      },
      null,
      2,
    ),
  );
} finally {
  await db.close();
}
