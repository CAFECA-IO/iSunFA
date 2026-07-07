import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://isunfa.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/user/", "/cafeca/", "/share/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
