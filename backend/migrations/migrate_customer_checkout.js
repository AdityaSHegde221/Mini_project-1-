import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateCustomerCheckout() {
  const migrationPath = path.join(__dirname, '004_customer_shop_checkout.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Customer-shopkeeper checkout schema migrated successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Customer-shopkeeper checkout migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateCustomerCheckout();
