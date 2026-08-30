import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "GiveBack — Food Rescue Network", template: "%s | GiveBack" },
  description: "Give safe surplus food a second chance. GiveBack connects donors, community groups and people who can collect food before it goes to waste.",
  applicationName: "GiveBack",
  category: "food, community, sustainability",
  keywords: ["food rescue", "surplus food", "food waste", "free food", "community food sharing", "food donation", "GiveBack"],
  authors: [{ name: "Koglesh R. Murugan" }],
  creator: "Koglesh R. Murugan",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
  openGraph: { title: "GiveBack — Food Rescue Network", description: "Good food should reach a person, not a bin.", type: "website", siteName: "GiveBack" },
  twitter: { card: "summary_large_image", title: "GiveBack — Food Rescue Network", description: "Connect surplus food with people who can collect it in time." },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#f5f6ef", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
