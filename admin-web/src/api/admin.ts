import client from './client';
import type { AdminUser } from '../types/user';

export const getUsers = () =>
  client.get<AdminUser[]>('/admin/users').then((r) => r.data);

export const updateUser = (
  id: string,
  data: { role?: 'user' | 'admin'; email?: string | null; yodleeLoginName?: string | null },
) => client.patch<AdminUser>(`/admin/users/${id}`, data).then((r) => r.data);

export const getSandboxPool = () =>
  client.get<{ pool: string[] }>('/admin/sandbox-pool').then((r) => r.data.pool);
