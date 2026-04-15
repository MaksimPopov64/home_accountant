export type Role = "ADMIN" | "MEMBER";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  color: string;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
  userId: number;
  categoryId: number;
  user: Pick<User, "id" | "name" | "color">;
  category: Category;
}

export interface DashboardData {
  total: number;
  byCategory: { name: string; icon: string; color: string; total: number }[];
  byUser: { name: string; color: string; total: number }[];
  recentExpenses: Expense[];
}

// Extend next-auth types
declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    color: string;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      color: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    color: string;
  }
}
