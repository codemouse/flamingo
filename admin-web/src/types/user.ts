export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  role: 'user' | 'admin';
  yodleeLoginName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  role: 'user' | 'admin';
  yodleeLoginName: string | null;
  createdAt: string;
  updatedAt: string;
}
