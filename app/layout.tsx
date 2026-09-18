import type { Metadata } from "next";
import "./globals.css";
const title = "Sortify — A little order for your music";
const description =
  "Turn your Spotify library into playlists that feel like you.";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.APP_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  title,
  description,
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
