import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/landing";

/**
 * Sitemap for the public surface. The landing page is priority 1.0; the
 * create/join entry points are linked so crawlers can reach the funnel. The
 * authenticated app screens (predictions/leaderboard) are per-league and not
 * indexable, so they are intentionally omitted.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/create`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/join`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
