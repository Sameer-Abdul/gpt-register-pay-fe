const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    user: process.env.DB_USERNAME || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'register_payment',
    password: process.env.DB_PASSWORD || '7799179121',
    port: parseInt(process.env.DB_PORT || '5432', 10),
  });

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Run all migrations in order
    const migrations = [
      '003_create_payments_table.sql',
      '004_add_updated_at_to_register.sql'
    ];
    
    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, '..', 'src', 'lib', 'migrations', migrationFile);
      const migrationSQL = await fs.readFile(migrationPath, 'utf8');
      
      console.log(`Running migration: ${migrationFile}`);
      await client.query(migrationSQL);
    }
    
    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
