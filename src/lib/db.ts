import { Pool } from 'pg';

// Create a new pool using the environment variables
// It will automatically use POSTGRES_URL if defined (or PGHOST, PGUSER, etc.)
export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

export async function initDb() {
  const client = await pool.connect();
  try {
    // Create the schedules table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        route VARCHAR(100) NOT NULL, -- e.g., 'San Antonio - Valparaiso (Costa)'
        departure_time TIME NOT NULL,
        arrival_time TIME,
        day_of_week VARCHAR(20) NOT NULL, -- e.g., 'Monday', 'Weekend', etc.
        valid_from DATE DEFAULT CURRENT_DATE,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        source_image_url TEXT
      );
    `);
    console.log("Database initialized");
  } finally {
    client.release();
  }
}
