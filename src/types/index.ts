export type Role = "ADMIN" | "MEMBER";

export interface Household {
  id: number;
  name: string;
  inviteCode: string;
  createdAt: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  color: string;
  createdAt: string;
  householdId: number;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  householdId: number;
}

export interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
  userId: number;
  categoryId: number;
  householdId: number;
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
    householdId: string;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      color: string;
      householdId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    color: string;
    householdId: string;
  }
}
