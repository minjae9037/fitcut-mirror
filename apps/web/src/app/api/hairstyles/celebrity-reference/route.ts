import { NextResponse } from "next/server";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 25;

const maxReferenceImageBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 8 * 1024,
    rateLimit: {
      key: "hairstyles:celebrity-reference",
      limit: 40,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  try {
    const payload = (await request.json()) as {
      title?: string;
      url?: string;
    };
    const imageUrl = parseImageUrl(payload.url);

    if (!imageUrl) {
      return NextResponse.json(
        { error: "유효한 이미지 주소를 입력해 주세요." },
        { status: 400 },
      );
    }

    const response = await fetchImageReference(imageUrl);

    if (!response?.ok) {
      return NextResponse.json(
        { error: "이미지 주소에서 파일을 불러오지 못했습니다." },
        { status: 422 },
      );
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);

    if (contentLength > maxReferenceImageBytes) {
      return NextResponse.json(
        { error: "이미지 파일이 너무 큽니다. 10MB 이하 이미지를 사용해 주세요." },
        { status: 413 },
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    const arrayBuffer = await response.arrayBuffer();

    if (arrayBuffer.byteLength > maxReferenceImageBytes) {
      return NextResponse.json(
        { error: "이미지 파일이 너무 큽니다. 10MB 이하 이미지를 사용해 주세요." },
        { status: 413 },
      );
    }

    if (!isAllowedImage(contentType, imageUrl)) {
      return NextResponse.json(
        { error: "해당 링크는 이미지 파일로 확인되지 않습니다." },
        { status: 415 },
      );
    }

    return new Response(arrayBuffer, {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": `inline; filename="${buildFileName(payload.title)}"`,
        "content-type": normalizeContentType(contentType, imageUrl),
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이미지 링크를 처리하지 못했습니다.",
      },
      { status: 500 },
    );
  }
}

function parseImageUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.trim());

    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      isPrivateOrLocalHost(url.hostname)
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

async function fetchImageReference(imageUrl: string) {
  let currentUrl = imageUrl;

  for (let redirectCount = 0; redirectCount < 4; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      cache: "no-store",
      headers: {
        accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.8",
        "user-agent":
          "Mozilla/5.0 (compatible; MiriLookBot/1.0; +https://mirilook.com)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get("location");

    if (!location) {
      return response;
    }

    const nextUrl = parseImageUrl(new URL(location, currentUrl).toString());

    if (!nextUrl) {
      return null;
    }

    currentUrl = nextUrl;
  }

  return null;
}

function isPrivateOrLocalHost(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "0.0.0.0" ||
    normalized === "::1"
  ) {
    return true;
  }

  if (normalized.includes(":")) {
    return (
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80") ||
      normalized === "::"
    );
  }

  const ipv4 = normalized.split(".").map((part) => Number(part));

  if (ipv4.length !== 4 || ipv4.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [first, second] = ipv4;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127)
  );
}

function isAllowedImage(contentType: string, imageUrl: string) {
  const normalized = contentType.toLowerCase().split(";")[0]?.trim() ?? "";

  if (
    ["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"].includes(
      normalized,
    )
  ) {
    return true;
  }

  return /\.(avif|gif|jpe?g|png|webp)(\?.*)?$/i.test(imageUrl);
}

function normalizeContentType(contentType: string, imageUrl: string) {
  const normalized = contentType.toLowerCase().split(";")[0]?.trim() ?? "";

  if (
    ["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"].includes(
      normalized,
    )
  ) {
    return normalized;
  }

  if (/\.png(\?.*)?$/i.test(imageUrl)) {
    return "image/png";
  }

  if (/\.webp(\?.*)?$/i.test(imageUrl)) {
    return "image/webp";
  }

  if (/\.gif(\?.*)?$/i.test(imageUrl)) {
    return "image/gif";
  }

  return "image/jpeg";
}

function buildFileName(title: string | undefined) {
  const normalized = (title ?? "celebrity-reference")
    .replace(/[^a-zA-Z0-9가-힣_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${normalized || "celebrity-reference"}.jpg`;
}
