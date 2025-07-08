import 'dotenv/config';
import mysql from 'mysql2/promise';

declare global {
  // Allow global `var` declarations
  // for storing the connection pool
  var dbPool: mysql.Pool | undefined;
}

const pool = globalThis.dbPool || mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.dbPool = pool;
}

export default pool;
