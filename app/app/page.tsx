import type { Metadata } from "next";
import Sortify from "../../components/sortify";
import {
  appTitle,
  appDescription,
  siteUrl,
  serializeSchema,
} from "../../lib/seo";
export const metadata: Metadata = {
  title: appTitle,
  description: appDescription,
  alternates: { canonical: "/app" },
  openGraph: {
    title: appTitle,
    description: appDescription,
    url: "/app",
    type: "website",
    siteName: "Sortify",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Sortify — Find your music again",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: appTitle,
    description: appDescription,
    images: [
      { url: "/twitter-image.png", alt: "Sortify — Find your music again" },
    ],
  },
};
export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeSchema({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Sortify",
                item: siteUrl.href,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Open Sortify",
                item: new URL("/app", siteUrl).href,
              },
            ],
          }),
        }}
      />
      <Sortify />
    </>
  );
}
