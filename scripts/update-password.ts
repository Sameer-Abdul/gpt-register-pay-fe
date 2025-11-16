import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USERNAME || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'register_payment',
  password: process.env.DB_PASSWORD || '7799179121',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function updatePassword() {
  const email = 'test@example.com';
  const password = 'password123';
  
  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    console.log('Updating password for user:', email);
    console.log('Hashed password:', hashedPassword);
    
    // Update the user's password
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email',
      [hashedPassword, email]
    );
    
    if (result.rows.length > 0) {
      console.log('Password updated successfully for user:', result.rows[0].email);
    } else {
      console.error('User not found with email:', email);
    }
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

updatePassword().catch(console.error);
