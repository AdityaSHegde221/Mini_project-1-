import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateAdminCatalog() {
  const migrationPath = path.join(__dirname, '003_admin_catalog_management.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Admin and catalog schema migrated successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin and catalog migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateAdminCatalog();
