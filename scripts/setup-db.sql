-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create licenses table if it doesn't exist
CREATE TABLE IF NOT EXISTS licenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Create or update test user (password is 'password123' hashed with bcrypt)
INSERT INTO users (email, password, name, role, created_at, updated_at)
VALUES (
  'test@example.com', 
  '$2a$10$XFDq3wW1vK/5eJtJYH9JQO9v6dW8X1Xx1Xx1Xx1Xx1Xx1Xx1Xx1Xx1', 
  'Test User', 
  'admin',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) 
DO UPDATE SET 
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = CURRENT_TIMESTAMP
RETURNING id;

-- Create or update license for the test user
WITH user_id AS (
  SELECT id FROM users WHERE email = 'test@example.com'
)
INSERT INTO licenses (user_id, expires_at, created_at, updated_at)
SELECT id, NOW() + INTERVAL '1 year', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM user_id
ON CONFLICT (user_id) 
DO UPDATE SET 
  expires_at = EXCLUDED.expires_at,
  updated_at = CURRENT_TIMESTAMP;

-- Verify the test user and license
SELECT u.id, u.email, u.name, u.role, l.expires_at as license_expires
FROM users u
LEFT JOIN licenses l ON u.id = l.user_id
WHERE u.email = 'test@example.com';
