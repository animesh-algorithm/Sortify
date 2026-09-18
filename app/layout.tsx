import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import {
  siteUrl,
  homeTitle as title,
  homeDescription as description,
} from "../lib/seo";
import "./globals.css";
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  preload: false,
});
export const metadata: Metadata = {
  metadataBase: siteUrl,
  title,
  description,
  robots: { index: true, follow: true },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml" } },
  openGraph: {
    title,
    description,
    siteName: "Sortify",
    type: "website",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title, description },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
