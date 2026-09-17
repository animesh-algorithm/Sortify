import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sortify — Library Workbench",
  description: "A private workbench for safely organizing a Spotify library.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
