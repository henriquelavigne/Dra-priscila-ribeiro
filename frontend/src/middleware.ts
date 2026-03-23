import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    secret: process.env.NEXTAUTH_SECRET ?? "priscila_agendor_secret_key_dev_2026",
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
    cookies: {
      sessionToken: {
        name: `priscila-agendor.session-token`,
      },
    },
  }
);

// Proteger todas as rotas sob /api, /dashboard, /schedule, /finances, /workplaces
// mas liberar /login, /api/auth, /_next, favicon, manifest
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - login (login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, manifest.json, fonts (public files)
     */
    "/((?!api/auth|api/settings|login|_next/static|_next/image|favicon.ico|manifest.json|fonts).*)",
  ],
};
