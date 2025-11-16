export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  tenantId: string;
  tenantName?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  mobile: string;
  tenantId: string;
}

export interface Tenant {
  id: string;
  name: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}
