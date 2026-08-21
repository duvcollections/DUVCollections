import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/cart", "/search", "/admin", "/api"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
