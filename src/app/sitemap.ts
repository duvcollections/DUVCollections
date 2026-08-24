import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getProducts, visibleCategories } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  // An empty category is not worth a sitemap entry.
  const cats = await visibleCategories();
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly" | "yearly") => ({
    url: `${site.url}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    page("", 1, "daily"),
    page("/shop", 0.9, "daily"),
    ...cats.map((c) => page(`/shop/${c.id}`, 0.85, "daily")),
    ...products.map((p) => page(`/product/${p.slug}`, 0.7, "weekly")),
    page("/custom-printing", 0.8, "monthly"),
    page("/about", 0.6, "monthly"),
    page("/contact", 0.6, "monthly"),
    page("/faq", 0.6, "monthly"),
    page("/orders", 0.5, "monthly"),
    page("/policies/shipping", 0.4, "yearly"),
    page("/policies/returns", 0.4, "yearly"),
    page("/policies/payment", 0.4, "yearly"),
    page("/policies/privacy", 0.4, "yearly"),
    page("/policies/terms", 0.4, "yearly"),
  ];
}
