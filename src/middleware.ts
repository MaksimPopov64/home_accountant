export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    // Public: auth pages, invite links, and the PWA manifest/icons (browsers fetch them without cookies)
    "/((?!login|register|join|api/auth|api/households|manifest.webmanifest|icon|apple-icon|pwa-icon|_next/static|_next/image|favicon.ico).*)",
  ],
};
