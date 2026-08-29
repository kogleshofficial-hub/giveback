import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "GiveBack — Give what you don't need. Find what you do.", template: "%s | GiveBack" },
  description: "A community-first place to give useful items a second home and discover things people are ready to pass on.",
  applicationName: "GiveBack",
  category: "community",
  keywords: ["give away", "donate items", "free items", "reuse", "community", "second hand", "giveback"],
  authors: [{ name: "Koglesh R. Murugan" }],
  creator: "Koglesh R. Murugan",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
  openGraph: { title: "GiveBack — Give what you don't need. Find what you do.", description: "Useful things deserve a second home.", type: "website", siteName: "GiveBack" },
  twitter: { card: "summary_large_image", title: "GiveBack", description: "Give what you don't need. Find what you do." },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#f6f1e8", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<div className="border-t border-[var(--line)] bg-white"><nav aria-label="GiveBack tools" className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-5 py-3 text-xs font-bold text-[var(--muted)]"><a href="/" className="hover:text-[var(--ink)]">Discover</a><a href="/?view=dashboard" className="hover:text-[var(--ink)]">My GiveBack</a><a href="/messages" className="hover:text-[var(--ink)]">Private messages</a><a href="/notifications" className="hover:text-[var(--ink)]">Notifications</a></nav></div></body></html>;
}
