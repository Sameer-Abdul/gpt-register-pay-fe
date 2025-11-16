import { Pool, PoolClient, QueryResult } from 'pg';

// Log environment variables for debugging
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  VERCEL: process.env.VERCEL || 'not set',
  DB_HOST: process.env.DB_HOST ? '***.neon.tech' : 'not set',
  DB_NAME: process.env.DB_NAME || 'not set',
  DB_USERNAME: process.env.DB_USERNAME ? '***' : 'not set',
  DB_PASSWORD: process.env.DB_PASSWORD ? '***' : 'not set',
  DB_PORT: process.env.DB_PORT || '5432'
});

const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

// Connection configuration for Neon DB
const getPoolConfig = () => {
  // Log the environment for debugging
  console.log('Database connection environment:', {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? '***' : 'not set',
    DB_HOST: process.env.DB_HOST ? '***' : 'not set',
    DB_NAME: process.env.DB_NAME ? '***' : 'not set',
    DB_USERNAME: process.env.DB_USERNAME ? '***' : 'not set',
    DB_PASSWORD: process.env.DB_PASSWORD ? '***' : 'not set',
    DB_PORT: process.env.DB_PORT || '5432'
  });

  // If DATABASE_URL is provided, use it directly
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL for connection');
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for Vercel + Neon
      }
    };
  }

  console.log('Using individual database configuration');
  // Fallback to individual environment variables for local development
  return {
    user: process.env.DB_USERNAME || 'neondb_owner',
    host: process.env.DB_HOST || 'ep-muddy-morning-a1uawyew-pooler.ap-southeast-1.aws.neon.tech',
    database: process.env.DB_NAME || 'neondb',
    password: process.env.DB_PASSWORD || 'npg_s1PQVRzS8wgW',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    ssl: {
      rejectUnauthorized: false
    }
  };
};

// Create the connection pool
const poolConfig = {
  ...getPoolConfig(),
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20
};

console.log('Database pool configuration:', {
  ...poolConfig,
  connectionString: poolConfig.connectionString ? '***' : 'not set',
  password: poolConfig.password ? '***' : 'not set'
});

const pool = new Pool(poolConfig);

// Test the database connection on startup
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to the database');
    const res = await client.query('SELECT NOW()');
    console.log('Database server time:', res.rows[0].now);
    client.release();
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
  }
})();

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function query(text: string, params: any[] = []): Promise<QueryResult> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      const res = await client.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, params, duration, rows: res.rowCount });
      return res;
    } catch (queryError) {
      console.error('Query error:', {
        text,
        params,
        error: queryError,
      });
      throw queryError;
    } finally {
      client.release();
    }
  } catch (connectionError) {
    console.error('Database connection error:', connectionError);
    throw new Error('Failed to get database connection');
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
