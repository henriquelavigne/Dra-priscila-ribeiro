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

// Protege apenas as páginas (não as rotas /api/*).
// Cada route handler de API é responsável pela sua própria autenticação se necessário.
export const config = {
  matcher: [
    "/((?!api/|login|_next/static|_next/image|favicon.ico|manifest.json|fonts).*)",
  ],
};
