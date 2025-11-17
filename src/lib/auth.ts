import NextAuth, { NextAuthOptions, Session, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { JWT } from 'next-auth/jwt';
import { randomBytes } from 'crypto';
import pool from './db';
import bcrypt from 'bcryptjs';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: string;
      isAdmin?: boolean;
      accessToken?: string;
      tenantId?: string;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    isAdmin?: boolean;
    tenantId?: string;
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email?: string | null;
    name?: string | null;
    role?: string;
    isAdmin?: boolean;
    tenantId?: string;
    accessToken?: string;
  }
}

// Function to generate a simple access token
function generateAccessToken(userId: string | number): string {
  // In a production environment, use a proper JWT or OAuth2 token
  const token = `token_${userId}_${randomBytes(32).toString('hex')}`;
  console.log(`Generated access token for user ${userId}`);
  return token;
}

// Function to validate user credentials
async function validateUser(credentials: { email: string; password: string }) {
  try {
    console.log('Validating user:', credentials.email);
    
    // Get user from register table with tenant information
    const userQuery = await pool.query(
      `SELECT r.id, r.email, r.password_hash as password, 
              r.first_name as name, r.is_admin, r.tenant_id
       FROM register r
       WHERE r.email = $1`,
      [credentials.email.toLowerCase().trim()]
    );

    if (userQuery.rows.length === 0) {
      console.log('No user found with email:', credentials.email);
      throw new Error('Invalid email or password');
    }

    const user = userQuery.rows[0];
    
    // Verify password
    const isValid = await bcrypt.compare(credentials.password, user.password);
    
    if (!isValid) {
      console.log('Invalid password for user:', user.email);
      throw new Error('Invalid email or password');
    }

    // Check if user is admin - skip license check for admin
    if (!user.is_admin) {
      // Check if tenant has a valid license
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const licenseQuery = await pool.query(
        `SELECT 1 
         FROM license 
         WHERE tenant_id = $1 
         AND valid_from <= $2 
         AND valid_to >= $2
         AND eligible_for_license = 'Yes'
         LIMIT 1`,
        [user.tenant_id, today]
      );

      if (licenseQuery.rows.length === 0) {
        console.log('No valid license found for tenant:', user.tenant_id);
        throw new Error('Your license has expired. Please contact the administrator.');
      }
    }

    // Generate access token
    const accessToken = generateAccessToken(user.id);
    
    // Return user data without password
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.is_admin ? 'admin' : 'user',
      isAdmin: user.is_admin,
      tenantId: user.tenant_id,
      accessToken
    };
  } catch (error) {
    console.error('Validation error:', error);
    throw error;
  }
}

// Debug function to log auth events
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true') {
    console.log('[NextAuth]', ...args);
  }
};

// Ensure NEXTAUTH_URL is set in development
if (process.env.NODE_ENV === 'development' && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  console.warn('NEXTAUTH_URL not set, defaulting to http://localhost:3000');
}

// Ensure required environment variables are set
const requiredEnvVars = ['NEXTAUTH_SECRET'];
if (process.env.NODE_ENV === 'production') {
  requiredEnvVars.push('NEXTAUTH_URL');
}

// Get base URL for cookies
const isProduction = process.env.NODE_ENV === 'production';
const protocol = isProduction ? 'https://' : 'http://';
const host = process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '') || 'localhost:3000';
const baseUrl = `${protocol}${host}`;

// Check for missing environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(errorMsg);
  } else {
    console.warn(`⚠️  ${errorMsg}`);
  }
}

export const authOptions: NextAuthOptions = {
  // Session configuration
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Security
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key',
  
  // Configure cookies
  useSecureCookies: isProduction, // Enable secure cookies in production
  cookies: {
    sessionToken: {
      name: isProduction ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction, // secure only on Vercel
        // No domain specified for cross-domain compatibility
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  
  // Debug configuration
  debug: process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true',
  
  // Configure JWT
  jwt: {
    secret: process.env.NEXTAUTH_SECRET || 'your-secret-key',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Logger configuration
  logger: {
    error(code, metadata) {
      console.error('[NextAuth Error]', code, metadata);
    },
    warn(code) {
      console.warn('[NextAuth Warning]', code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development' || process.env.NEXTAUTH_DEBUG === 'true') {
        console.log('[NextAuth Debug]', code, metadata);
      }
    }
  },
  
  // Pages configuration
  pages: {
    signIn: '/event-scheduler/login',
    error: '/event-scheduler/login?error=', // Allow passing error messages
  },
  
  // Authentication providers
  providers: [
    {
      id: 'credentials',
      name: 'Credentials',
      type: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: any) {
        // This will hold our custom error message if any
        let customError = null;
        
        try {
          console.log('Authorization attempt with credentials:', {
            email: credentials?.email,
            hasPassword: !!credentials?.password
          });

          if (!credentials?.email || !credentials?.password) {
            console.error('Missing credentials');
            throw new Error('Email and password are required');
          }

          // Get user from register table with error handling
          let userQuery;
          try {
            userQuery = await pool.query(
              `SELECT id, email, password_hash as password, first_name as name, is_admin, tenant_id 
               FROM register 
               WHERE email = $1`,
              [credentials.email.toLowerCase().trim()]
            );
            console.log('Database query result:', userQuery.rows[0]);
          } catch (dbError) {
            console.error('Database query error:', dbError);
            throw new Error('Authentication service unavailable');
          }

          if (userQuery.rows.length === 0) {
            console.error('No user found with email:', credentials.email);
            // Return null with a custom error that will be caught by NextAuth
            return null;
          }

          const user = userQuery.rows[0];
          console.log('Found user:', { 
            id: user.id, 
            email: user.email,
            hasPassword: !!user.password,
            isAdmin: user.is_admin,
            tenantId: user.tenant_id
          });
          
          // Skip license check for admin users
          if (!user.is_admin) {
            // Check license validity
            const today = new Date().toISOString().split('T')[0];
            console.log('Checking license for tenant:', user.tenant_id, 'on date:', today);
            
            try {
              const licenseQuery = await pool.query(
                `SELECT 1 
                 FROM license 
                 WHERE tenant_id = $1 
                 AND valid_from <= $2 
                 AND valid_to >= $2
                 AND eligible_for_license = 'Yes'
                 LIMIT 1`,
                [user.tenant_id, today]
              );
              
              console.log('License check result:', { 
                hasValidLicense: licenseQuery.rows.length > 0,
                tenantId: user.tenant_id
              });
              
              if (licenseQuery.rows.length === 0) {
                console.error('No valid license found for tenant:', user.tenant_id);
                // Create a custom error that will be caught by NextAuth
                const error = new Error('LICENSE_EXPIRED: Your license has expired. Please contact the administrator.');
                error.name = 'LicenseExpiredError';
                console.log('Throwing license expired error');
                // Return null with the error to trigger the error page
                throw error;
              }
            } catch (licenseError: any) {
              console.error('License validation error:', licenseError);
              // If it's already a license error, rethrow it
              if (licenseError.name === 'LicenseExpiredError' || licenseError.message?.includes('LICENSE_EXPIRED')) {
                throw licenseError;
              }
              // For other errors, create a new license error
              const error = new Error('LICENSE_EXPIRED');
              error.name = 'LicenseExpiredError';
              error.message = 'Your license has expired. Please contact the administrator.';
              console.log('License validation failed with error, converted to license error');
              throw error;
            }
          } else {
            console.log('Skipping license check for admin user');
          }
          
          // Verify password with detailed logging
          let isValid = false;
          const passwordToCheck = credentials.password;
          const storedHash = user.password;
          
          console.log('Password check:', {
            inputLength: passwordToCheck?.length,
            storedHash: storedHash ? `${storedHash.substring(0, 10)}...` : 'none',
            isBcrypt: storedHash?.startsWith('$2')
          });
          
          try {
            // First try bcrypt comparison if hash looks like bcrypt
            if (storedHash?.startsWith('$2')) {
              console.log('Attempting bcrypt comparison');
              isValid = await bcrypt.compare(passwordToCheck, storedHash);
              console.log('Bcrypt comparison result:', isValid);
            } 
            
            // If bcrypt comparison wasn't attempted or failed, check plain text (for development only)
            if (!isValid && !storedHash?.startsWith('$2') && storedHash === passwordToCheck) {
              console.log('Plain text password match (development only)');
              isValid = true;
            }
          } catch (compareError) {
            console.error('Password comparison error:', compareError);
            throw new Error('Authentication failed');
          }

          if (!isValid) {
            console.error('Invalid password for user:', user.email);
            throw new Error('Invalid email or password');
          }

          // If we get here, authentication was successful
          console.log('Authentication successful for user:', user.email);
          
          // If we get here, authentication was successful
          console.log('Authentication successful for user:', user.email);
          
          // Return user object (without password) that will be encoded in the JWT
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name || user.email.split('@')[0],
            isAdmin: user.is_admin,
            role: user.is_admin ? 'admin' : 'user',
            tenantId: user.tenant_id
          };          } catch (error: any) {
            console.error('Authorization error:', error);
            // If it's a license error, rethrow it with the original message
            if (error.name === 'LicenseExpiredError' || error.message?.includes('LICENSE_EXPIRED')) {
              // Format the error to be properly handled by NextAuth
              const err = new Error(error.message);
              err.name = 'LicenseExpiredError';
              throw err;
            }
            // For other errors, return null to trigger the default error handling
            return null;
          }
      }
    }
  ],
  
  // Callbacks for JWT and session handling
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        // Add user info to the token
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.isAdmin = user.isAdmin;
        token.tenantId = user.tenantId;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      // Log the session callback for debugging
      console.log('Session Callback - Input:', { session, token });
      
      // Send properties to the client
      if (session.user) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: (token.role as string) || 'user',
          isAdmin: token.isAdmin as boolean,
          email: token.email as string,
          name: token.name as string,
          accessToken: token.accessToken as string,
          tenantId: token.tenantId as string
        };
      }
      
      console.log('Session Callback - Output:', {
        userId: session.user?.id,
        email: session.user?.email,
        role: session.user?.role,
        isAdmin: session.user?.isAdmin,
        hasAccessToken: !!(session.user as any)?.accessToken,
        expires: session.expires
      });
      
      return session;
    },
    async redirect({ url, baseUrl }) {
      const loginUrl = `${baseUrl}/event-scheduler/login`;
      const userDashboard = `${baseUrl}/event-scheduler/dashboard`;
      const adminDashboard = `${baseUrl}/admin-dashboard`;

      // LOGOUT FIX — always go to login page
      if (url.includes("/api/auth/signout")) {
        return loginUrl;
      }

      // After login
      if (url.includes("/callback/credentials")) {
        // role-based redirect supported later on session load
        return userDashboard;
      }

      // Allow internal paths
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      return baseUrl;
    },
  },
};

// Check if NEXTAUTH_SECRET is set
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('NEXTAUTH_SECRET is not set. This may cause authentication issues in production.');
}

// Create NextAuth handler
export const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
