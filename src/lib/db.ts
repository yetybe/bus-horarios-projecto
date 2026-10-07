import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`DROP TABLE IF EXISTS schedules;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS weekly_schedules (
        id SERIAL PRIMARY KEY,
        day_of_week VARCHAR(20) NOT NULL,
        day_date DATE,
        departure_time TIME NOT NULL,
        arrival_time TIME,
        route VARCHAR(200) NOT NULL,
        week_label VARCHAR(100),
        source_image_url TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database initialized");
  } finally {
    client.release();
  }
}
