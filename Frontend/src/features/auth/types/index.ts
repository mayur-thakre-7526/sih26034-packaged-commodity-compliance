export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;
  status?: 'active' | 'inactive';
  is_active?: boolean;
  created_at?: string;
  [key: string]: unknown;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthResponse {
  user?: UserSession;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  session?: {
    access_token?: string;
    refresh_token?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}
