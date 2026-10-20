import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          color: user.color,
          householdId: user.householdId ? String(user.householdId) : null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;

      // Re-read the user on every session check so role, household and profile
      // changes (and deletions) take effect immediately instead of living in a stale JWT.
      let dbUser;
      try {
        dbUser = await prisma.user.findUnique({
          where: { id: parseInt(token.id) },
          select: { name: true, email: true, role: true, color: true, householdId: true },
        });
      } catch {
        return token; // DB hiccup: keep the current token rather than logging the user out
      }
      // Throwing makes next-auth clear the session cookie
      if (!dbUser) throw new Error("User no longer exists");

      token.name = dbUser.name;
      token.email = dbUser.email;
      token.role = dbUser.role;
      token.color = dbUser.color;
      token.householdId = dbUser.householdId ? String(dbUser.householdId) : null;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.name = token.name ?? "";
        session.user.email = token.email ?? "";
        session.user.role = token.role;
        session.user.color = token.color;
        session.user.householdId = token.householdId;
      }
      return session;
    },
  },
};
