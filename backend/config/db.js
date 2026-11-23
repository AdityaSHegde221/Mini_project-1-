import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('FATAL: DATABASE_URL is not defined in environment variables.');
}

const isProduction = process.env.NODE_ENV === 'production';
const isCloudDb = connectionString && (connectionString.includes('supabase.co') || connectionString.includes('render.com') || connectionString.includes('sslmode=require'));

export const pool = new Pool({
  connectionString,
  ssl: isCloudDb || isProduction ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export const query = (text, params) => pool.query(text, params);

export const getClient = () => pool.connect();

export default pool;
