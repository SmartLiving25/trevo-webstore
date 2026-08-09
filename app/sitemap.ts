import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    ["", "daily", 1],
    ["/bags", "daily", 0.9],
    ["/new-arrivals", "daily", 0.9],
    ["/our-story", "monthly", 0.7],
    ["/contact", "monthly", 0.6],
    ["/returns", "monthly", 0.5],
    ["/privacy", "yearly", 0.4],
    ["/terms", "yearly", 0.4],
  ] as const;

  return pages.map(([path, changeFrequency, priority]) => ({
    url: `https://trevopk.com${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
