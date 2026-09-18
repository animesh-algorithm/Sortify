import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Sortify — A little order for your music",
  icons: { icon: "/favicon.svg" },
  description: "Turn your Spotify library into playlists that feel like you.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
