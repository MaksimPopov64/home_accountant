import { appIcon } from "@/lib/appIcon";

// PWA manifest icons: /pwa-icon/192, /pwa-icon/512, /pwa-icon/512-maskable
export function GET(_req: Request, { params }: { params: { variant: string } }) {
  const [size, kind] = params.variant.split("-");
  if (size !== "192" && size !== "512") return new Response("Not found", { status: 404 });
  return appIcon(Number(size), { maskable: kind === "maskable" });
}
