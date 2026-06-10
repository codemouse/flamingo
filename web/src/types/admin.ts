export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
}

export interface AdminPlaidItem {
  id: string;
  itemId: string;
  userId: string;
  institutionId: string | null;
  institutionName: string | null;
  cursor: string | null;
  createdAt: string;
  updatedAt: string;
}
