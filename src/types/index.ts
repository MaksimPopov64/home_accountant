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
  monthlyBudget?: number | null;
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

export interface ExpensesResponse {
  items: Expense[];
  total: number;
  count: number;
}

export interface TrendPoint {
  month: string;
  total: number;
  year: number;
  monthIndex: number;
}

export interface RecurringExpense {
  id: number;
  amount: number;
  description: string;
  dayOfMonth: number;
  lastGenerated: string;
  userId: number;
  categoryId: number;
  user: Pick<User, "id" | "name" | "color">;
  category: Category;
}

export interface Suggestion {
  description: string;
  categoryId: number;
}

export interface Comparison {
  from: string;
  to: string;
  partial: boolean;
  total: number;
}

export interface Prediction {
  dailyRate: number;
  projected: number;
  daysLeft: number;
}

export interface DashboardData {
  total: number;
  byCategory: { id: number; name: string; icon: string; color: string; total: number; monthlyBudget?: number | null }[];
  byUser: { name: string; color: string; total: number }[];
  recentExpenses: Expense[];
  prediction?: Prediction;
  comparison?: Comparison;
}

// Extend next-auth types
declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    color: string;
    householdId: string | null;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      color: string;
      householdId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    color: string;
    householdId: string | null;
  }
}
