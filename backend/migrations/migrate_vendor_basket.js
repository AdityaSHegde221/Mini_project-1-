import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../config/db.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(fs.readFileSync(path.join(directory, '005_vendor_basket_workflow.sql'), 'utf8'));
    await client.query('COMMIT');
    console.log('Vendor basket workflow schema migrated successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Vendor basket workflow migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

run();
