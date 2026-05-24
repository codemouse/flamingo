import client from './client';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export const register = (username: string, password: string, email?: string) =>
  client
    .post<AuthUser>('/auth/register', { username, password, email })
    .then((r) => r.data);

export const login = (username: string, password: string) =>
  client
    .post<LoginResponse>('/auth/login', { username, password })
    .then((r) => r.data);
