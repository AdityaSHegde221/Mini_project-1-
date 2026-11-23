import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

async function seedAdminDemo() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT id, role FROM users WHERE LOWER(email) = LOWER($1)',
      ['admin@procurement.com']
    );

    if (existing.rows.length > 0) {
      if (existing.rows[0].role !== 'Admin') {
        throw new Error('admin@procurement.com already exists with a non-Admin role; no account was changed.');
      }
      await client.query('COMMIT');
      console.log('Demo Admin already exists; no account changes made.');
      return;
    }

    const passwordHash = await bcrypt.hash('pass123', 10);
    await client.query(
      `INSERT INTO users (email, password_hash, role, full_name)
       VALUES ('admin@procurement.com', $1, 'Admin', 'FreshCart Administrator')`,
      [passwordHash]
    );

    await client.query('COMMIT');
    console.log('Demo Admin created: admin@procurement.com (password: pass123).');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdminDemo().catch((err) => {
  console.error('Failed to seed demo Admin:', err);
  process.exitCode = 1;
});
