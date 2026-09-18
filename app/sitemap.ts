import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/seo";
export default function sitemap(): MetadataRoute.Sitemap {
  // Only public pages; no OAuth URLs, user data or fabricated lastmod dates.
  return ["/", "/app"].map((path) => ({ url: new URL(path, siteUrl).href }));
}
