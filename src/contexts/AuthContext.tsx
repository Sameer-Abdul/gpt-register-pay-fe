'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { signIn, getSession } from 'next-auth/react';
import { User, Tenant, RegisterData } from '@/types/auth';

// Extend the User type with tenant validation
interface AuthUser extends User {
  tenant: Tenant;
  isLicenseValid: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  checkLicenseValidity: () => boolean;
  tenants: Tenant[];
  loadingTenants: boolean;
  fetchTenants: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const router = useRouter();

  // Fetch available tenants
  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      const response = await fetch('/api/tenants-v2');
      if (!response.ok) {
        throw new Error('Failed to fetch tenants');
      }
      const data = await response.json();
      if (data.success) {
        setTenants(data.data);
      } else {
        throw new Error(data.error || 'Failed to load tenant list');
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast.error('Failed to load tenant list');
    } finally {
      setLoadingTenants(false);
    }
  };

  // Check if user's license is valid
  const checkLicenseValidity = (): boolean => {
    if (!user) return false;
    const now = new Date();
    const validFrom = new Date(user.tenant.validFrom);
    const validTo = new Date(user.tenant.validTo);
    return now >= validFrom && now <= validTo;
  };

  useEffect(() => {
    // Check if user is logged in on initial load
    const checkAuth = async () => {
      try {
        // Check session storage for user data
        const userData = sessionStorage.getItem('user');
        const token = sessionStorage.getItem('token');
        
        if (userData && token) {
          const parsedUser = JSON.parse(userData);
          
          // Verify token/validity with backend
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userWithValidity = {
              ...parsedUser,
              isLicenseValid: checkLicenseValidity()
            };
            setUser(userWithValidity);
            
            // Redirect to login if license is invalid
            if (!userWithValidity.isLicenseValid) {
              toast.error('Your license has expired. Please contact support.');
              if (window.location.pathname !== '/login') {
                router.push('/login');
              }
            }
          } else {
            // Clear invalid session
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        toast.error('Failed to verify authentication');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    fetchTenants();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        callbackUrl: '/event-scheduler/dashboard',
      });

      if (result?.error) {
        throw new Error('Invalid email or password');
      }

      // Get the session after successful login
      const session = await getSession();
      if (!session?.user) {
        throw new Error('Failed to create session');
      }

      // Create a user object that matches the AuthUser interface
      const userWithValidity: AuthUser = {
        id: session.user.id || '0',
        name: session.user.name || '',
        email: session.user.email || '',
        mobile: '', // Add default value for mobile
        role: 'user', // Default role
        tenantId: '0', // Default tenant ID as string
        tenant: {
          id: '0', // Default values for tenant
          name: 'Default Tenant',
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
          isActive: true
        },
        isLicenseValid: true, // You might want to implement license validation here
      };
      
      setUser(userWithValidity);
      
      // Redirect to the dashboard or the URL provided by NextAuth
      const redirectUrl = result?.url || '/event-scheduler/dashboard';
      router.push(redirectUrl);
      
      toast.success('Login successful!');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please try again.');
      throw error;
    }
  };
  
  const register = async (data: RegisterData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const result = await response.json();
      
      // Auto-login after successful registration
      await login(data.email, data.password);
      
      toast.success('Registration successful! Redirecting...');
      return result;
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
      throw error;
    }
  };

  const logout = () => {
    // Clear session storage
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        checkLicenseValidity,
        tenants,
        loadingTenants,
        fetchTenants,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
