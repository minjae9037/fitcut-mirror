import type { MetadataRoute } from "next";

// 검색엔진 크롤링 규칙 — /robots.txt 로 노출. 공개 페이지 전체 허용, 비공개/유틸만 차단.
export default function robots(): MetadataRoute.Robots {
  const base = "https://mirilook.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/login", "/mypage", "/history", "/share/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
