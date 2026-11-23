import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../config/db.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(fs.readFileSync(path.join(directory, '006_shopkeeper_goods_receipts.sql'), 'utf8'));
    await client.query('COMMIT');
    console.log('Shopkeeper goods receipt workflow migrated successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Shopkeeper goods receipt migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
