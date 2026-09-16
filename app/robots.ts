import type { MetadataRoute } from "next";

// The tailor portal is a signed-in partner tool, not a public surface.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
