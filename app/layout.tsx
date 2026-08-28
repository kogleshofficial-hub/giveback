import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://giveback-app.vercel.app"),
  title: { default: "GiveBack — Give what you don't need. Find what you do.", template: "%s | GiveBack" },
  description: "A community-first place to give useful items a second home and discover things people are ready to pass on.",
  applicationName: "GiveBack",
  keywords: ["give away", "donate items", "free items", "reuse", "community", "second hand", "giveback"],
  authors: [{ name: "Koglesh R. Murugan" }],
  creator: "Koglesh R. Murugan",
  openGraph: { title: "GiveBack — Give what you don't need. Find what you do.", description: "Useful things deserve a second home.", type: "website", siteName: "GiveBack" },
  twitter: { card: "summary_large_image", title: "GiveBack", description: "Give what you don't need. Find what you do." },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#f6f1e8", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
