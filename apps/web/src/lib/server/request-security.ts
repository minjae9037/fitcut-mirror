type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RequestSecurityOptions = {
  allowCrossSite?: boolean;
  maxBodyBytes?: number;
  rateLimit?: RateLimitOptions;
  requireOrigin?: boolean;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const rateLimitBuckets = new Map<string, RateLimitBucket>();
let lastRateLimitCleanup = 0;

export function protectMutationRequest(
  request: Request,
  options: RequestSecurityOptions,
) {
  const bodySizeError = rejectLargeRequest(request, options.maxBodyBytes);

  if (bodySizeError) {
    return bodySizeError;
  }

  if (!options.allowCrossSite) {
    const crossSiteError = rejectCrossSiteMutation(
      request,
      Boolean(options.requireOrigin),
    );

    if (crossSiteError) {
      return crossSiteError;
    }
  }

  if (options.rateLimit) {
    const rateLimitError = rejectRateLimitedRequest(
      request,
      options.rateLimit,
    );

    if (rateLimitError) {
      return rateLimitError;
    }
  }

  return null;
}

function rejectLargeRequest(request: Request, maxBodyBytes?: number) {
  if (!maxBodyBytes) {
    return null;
  }

  const contentLength = request.headers.get("content-length");

  if (!contentLength) {
    return null;
  }

  const parsedLength = Number(contentLength);

  if (!Number.isFinite(parsedLength) || parsedLength <= maxBodyBytes) {
    return null;
  }

  return jsonSecurityError(
    "request_too_large",
    413,
    `Request body must be ${maxBodyBytes} bytes or less.`,
  );
}

function rejectCrossSiteMutation(request: Request, requireOrigin: boolean) {
  if (safeMethods.has(request.method.toUpperCase())) {
    return null;
  }

  const origin = normalizeOrigin(request.headers.get("origin"));
  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();

  if (!origin) {
    if (requireOrigin) {
      return jsonSecurityError(
        "origin_required",
        403,
        "A trusted request origin is required.",
      );
    }

    return secFetchSite === "cross-site"
      ? jsonSecurityError(
          "cross_site_request_blocked",
          403,
          "Cross-site mutation requests are not allowed.",
        )
      : null;
  }

  const allowedOrigins = getAllowedOrigins(request);

  return allowedOrigins.has(origin)
    ? null
    : jsonSecurityError(
        "cross_site_request_blocked",
        403,
        "Cross-site mutation requests are not allowed.",
      );
}

function rejectRateLimitedRequest(
  request: Request,
  { key, limit, windowMs }: RateLimitOptions,
) {
  const now = Date.now();

  cleanupExpiredRateLimitBuckets(now);

  const identifier = `${key}:${getClientIp(request)}`;
  const current = rateLimitBuckets.get(identifier);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });

    return null;
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));

    return Response.json(
      {
        error: "rate_limited",
        retryAfter,
      },
      {
        headers: {
          "Retry-After": String(retryAfter),
        },
        status: 429,
      },
    );
  }

  current.count += 1;
  return null;
}

function getAllowedOrigins(request: Request) {
  const origins = new Set<string>();
  const requestOrigin = normalizeOrigin(request.url);

  if (requestOrigin) {
    origins.add(requestOrigin);
  }

  [
    "https://mirilook.com",
    "https://www.mirilook.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ].forEach((value) => {
    const origin = normalizeOrigin(value);

    if (origin) {
      origins.add(origin);
    }
  });

  return origins;
}

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return "";
  }
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function cleanupExpiredRateLimitBuckets(now: number) {
  if (now - lastRateLimitCleanup < 60_000) {
    return;
  }

  lastRateLimitCleanup = now;

  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

function jsonSecurityError(reason: string, status: number, message: string) {
  return Response.json(
    {
      error: message,
      reason,
    },
    { status },
  );
}
