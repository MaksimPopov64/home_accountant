export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/((?!login|register|join|api/auth|api/households|_next/static|_next/image|favicon.ico).*)",
  ],
};
