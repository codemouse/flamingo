import client from "./client";
import type { AdminUser, AdminPlaidItem } from "../types/admin";

export const getUsers = () =>
  client.get<AdminUser[]>("/admin/users").then((r) => r.data);

export const updateUser = (
  id: string,
  data: { role?: "user" | "admin"; email?: string | null },
) => client.patch<AdminUser>(`/admin/users/${id}`, data).then((r) => r.data);

export const getSandboxPool = () =>
  client
    .get<{ pool: string[] }>("/admin/sandbox-pool")
    .then((r) => r.data.pool);

export const getAllPlaidItems = () =>
  client.get<AdminPlaidItem[]>("/plaid/items").then((r) => r.data);

export const removePlaidItem = (id: string) =>
  client.delete(`/plaid/items/${id}`);
