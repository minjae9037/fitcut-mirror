import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

type GoogleCustomSearchItem = {
  displayLink?: string;
  image?: {
    contextLink?: string;
    thumbnailLink?: string;
  };
  link?: string;
  title?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = sanitizeQuery(searchParams.get("q"));
  const googleSearchUrl = buildGoogleImagesUrl(query);

  if (!query) {
    return NextResponse.json(
      {
        configured: false,
        googleSearchUrl,
        items: [],
        reason: "검색어를 입력해 주세요.",
      },
      { status: 400 },
    );
  }

  const apiKey =
    process.env.GOOGLE_CUSTOM_SEARCH_API_KEY ??
    process.env.GOOGLE_IMAGE_SEARCH_API_KEY ??
    "";
  const searchEngineId =
    process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID ??
    process.env.GOOGLE_CSE_ID ??
    "";

  if (!apiKey || !searchEngineId) {
    return NextResponse.json({
      configured: false,
      googleSearchUrl,
      items: [],
      reason:
        "Google 이미지 검색 API 키 또는 검색 엔진 ID가 아직 연결되지 않았습니다. 링크 입력 또는 직접 업로드를 사용할 수 있습니다.",
    });
  }

  const url = new URL("https://customsearch.googleapis.com/customsearch/v1");

  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", searchEngineId);
  url.searchParams.set("q", query);
  url.searchParams.set("searchType", "image");
  url.searchParams.set("num", "8");
  url.searchParams.set("safe", "active");
  url.searchParams.set("imgType", "photo");

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        configured: true,
        googleSearchUrl,
        items: [],
        reason: "Google 이미지 검색 호출에 실패했습니다. API 키와 검색 엔진 설정을 확인해 주세요.",
      },
      { status: 502 },
    );
  }

  const payload = (await response.json()) as {
    items?: GoogleCustomSearchItem[];
  };
  const seen = new Set<string>();
  const items = (payload.items ?? [])
    .map((item, index) => ({
      id: `google-${index}-${hashText(item.link ?? item.title ?? String(index))}`,
      imageUrl: item.link ?? "",
      pageUrl: item.image?.contextLink,
      source: item.displayLink,
      thumbnailUrl: item.image?.thumbnailLink,
      title: sanitizeTitle(item.title, `Google 이미지 ${index + 1}`),
    }))
    .filter((item) => {
      if (!item.imageUrl || seen.has(item.imageUrl)) {
        return false;
      }

      seen.add(item.imageUrl);
      return true;
    });

  return NextResponse.json({
    configured: true,
    googleSearchUrl,
    items,
  });
}

function sanitizeQuery(value: string | null) {
  return (value ?? "").replace(/[<>]/g, "").trim().slice(0, 80);
}

function sanitizeTitle(value: string | undefined, fallback: string) {
  const title = (value ?? "").replace(/[<>]/g, "").trim().slice(0, 120);

  return title || fallback;
}

function buildGoogleImagesUrl(query: string) {
  const url = new URL("https://www.google.com/search");

  url.searchParams.set("tbm", "isch");
  if (query) {
    url.searchParams.set("q", query);
  }

  return url.toString();
}

function hashText(text: string) {
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}
