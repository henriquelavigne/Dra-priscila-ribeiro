import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? "priscila_agendor_secret_key_dev_2026",
    cookieName: "priscila-agendor.session-token",
  });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Protege apenas páginas — /api/* nunca passa por aqui
export const config = {
  matcher: [
    "/((?!api/|login|_next/static|_next/image|favicon.ico|manifest.json|fonts).*)",
  ],
};
