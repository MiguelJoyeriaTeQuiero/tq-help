import type { NextAuthConfig } from "next-auth";

// Configuración Edge-safe: sin bcrypt, sin Prisma, sin crypto.
// Solo callbacks JWT/session que leen el token ya firmado.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.department = (user as any).department;
        token.mustChangePassword = (user as any).mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.department = token.department as any;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },
  providers: [], // Los providers (Credentials + bcrypt) van en auth.ts
};
