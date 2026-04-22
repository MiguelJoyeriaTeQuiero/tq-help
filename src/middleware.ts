import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// Middleware usa auth.config.ts (Edge-safe, sin bcrypt ni Prisma)
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isPublicPath =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/status") ||
    nextUrl.pathname.startsWith("/faq") ||
    nextUrl.pathname.startsWith("/widget") ||
    nextUrl.pathname.startsWith("/api/status") ||
    nextUrl.pathname.startsWith("/api/faq") ||
    nextUrl.pathname.startsWith("/api/widget") ||
    nextUrl.pathname.startsWith("/api/chatbot") ||
    nextUrl.pathname.startsWith("/api/health") ||
    nextUrl.pathname.startsWith("/monitoring");

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Forzar cambio de contraseña en primer login
  if (isLoggedIn && req.auth?.user?.mustChangePassword) {
    if (
      !nextUrl.pathname.startsWith("/cambiar-password") &&
      !nextUrl.pathname.startsWith("/api") &&
      !nextUrl.pathname.startsWith("/login")
    ) {
      return NextResponse.redirect(new URL("/cambiar-password", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
