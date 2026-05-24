import client from './client';
import type { AuthUser } from '../types/user';

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export const login = (username: string, password: string) =>
  client
    .post<LoginResponse>('/auth/login', { username, password })
    .then((r) => r.data);
