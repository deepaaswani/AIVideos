import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';

export const migrationDirectory = new URL('../../../supabase/migrations/', import.meta.url);

export async function migrationFiles() {
  const names = (await readdir(migrationDirectory)).filter((name) => name.endsWith('.sql')).sort();
  const versions = new Set();
  return Promise.all(
    names.map(async (name) => {
      const version = name.match(/^(\d{14})_[a-z0-9_]+\.sql$/)?.[1];
      if (!version || versions.has(version))
        throw new Error(`Invalid or duplicate migration: ${name}`);
      versions.add(version);
      const sql = await readFile(new URL(name, migrationDirectory), 'utf8');
      return { name, version, sql, sha256: createHash('sha256').update(sql).digest('hex') };
    }),
  );
}

export async function createTestDatabase() {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = await PGlite.create();
  try {
    await db.exec(await readFile(new URL('../tests/auth-bootstrap.sql', import.meta.url), 'utf8'));
    const files = await migrationFiles();
    for (const file of files) await db.exec(file.sql);
    return { db, files };
  } catch (error) {
    await db.close();
    throw error;
  }
}
