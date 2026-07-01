import type { MetadataRoute } from "next";

const BASE = "https://mirilook.com";

// 사이트맵 — 구글/네이버가 공개 페이지를 발견·우선순위화하도록 나열. 비공개(마이페이지·히스토리·로그인·공유토큰)는 제외.
export default function sitemap(): MetadataRoute.Sitemap {
  const today = new Date().toISOString().slice(0, 10);

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "", priority: 1.0, changeFrequency: "daily" },
    { path: "/salons", priority: 0.8, changeFrequency: "weekly" },
    { path: "/community", priority: 0.7, changeFrequency: "daily" },
    { path: "/votes", priority: 0.7, changeFrequency: "daily" },
    { path: "/store", priority: 0.6, changeFrequency: "weekly" },
    { path: "/company", priority: 0.5, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/refund", priority: 0.3, changeFrequency: "yearly" },
  ];

  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: today,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
