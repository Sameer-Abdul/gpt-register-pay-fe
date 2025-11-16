const bcrypt = require('bcryptjs');
const { Pool: UserPool } = require('pg');

const userPool = new UserPool({
  user: process.env.DB_USERNAME || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'register_payment',
  password: process.env.DB_PASSWORD || '7799179121',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function createTestUser() {
  const email = 'test@example.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);
  const name = 'Test User';
  const role = 'admin';

  try {
    // Check if user already exists
    const userCheck = await userPool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userCheck.rows.length > 0) {
      console.log('User already exists, updating password...');
      await userPool.query(
        'UPDATE users SET password = $1 WHERE email = $2',
        [hashedPassword, email]
      );
    } else {
      console.log('Creating new user...');
      await userPool.query(
        'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)',
        [email, hashedPassword, name, role]
      );
    }

    // Get the user ID
    const userResult = await userPool.query('SELECT id FROM users WHERE email = $1', [email]);
    const userId = userResult.rows[0].id;

    // Check if license exists
    const licenseCheck = await userPool.query(
      'SELECT * FROM licenses WHERE user_id = $1',
      [userId]
    );

    if (licenseCheck.rows.length === 0) {
      console.log('Creating license...');
      await userPool.query(
        'INSERT INTO licenses (user_id, expires_at) VALUES ($1, NOW() + INTERVAL \'1 year\')',
        [userId]
      );
    } else {
      console.log('License already exists');
    }

    console.log('Test user created/updated successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await userPool.end();
    process.exit();
  }
}

createTestUser().catch(console.error);
