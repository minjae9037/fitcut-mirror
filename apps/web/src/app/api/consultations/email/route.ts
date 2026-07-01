import {
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";
import { readServerEnv } from "@/lib/server/env";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 60;

type EmailPayload = {
  item?: ConsultationEmailItem;
  to?: string;
};

type ConsultationEmailItem = {
  audienceName?: string;
  consultingFocusNames?: string[];
  createdAt?: string;
  hairColorName?: string;
  id?: string;
  images?: Array<{
    imageUrl?: string;
    label?: string;
  }>;
  memo?: string;
  makeupAdvice?: string;
  maintenanceAdvice?: string;
  outfitAdvice?: string;
  regionName?: string;
  salonProcess?: string;
  shareUrl?: string;
  sourcePhotoCount?: number;
  styleReason?: string;
  styleTags?: string[];
  styleName?: string;
};

type ResendResponse = {
  error?: string;
  id?: string;
  message?: string;
  name?: string;
};

const maxAttachmentBytes = 28 * 1024 * 1024;
const maxAttachmentFetchBytes = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 32 * 1024 * 1024,
    rateLimit: {
      key: "consultations:email",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: EmailPayload;

  try {
    payload = (await request.json()) as EmailPayload;
  } catch {
    return Response.json({ error: "Invalid email payload." }, { status: 400 });
  }

  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json(
      {
        reason: "not_authenticated",
        sent: false,
      },
      { status: 401 },
    );
  }

  const to = sanitizeEmail(payload.to);

  if (!to) {
    return Response.json({ error: "Valid recipient email is required." }, { status: 400 });
  }

  const item = payload.item;

  if (!item?.styleName || !Array.isArray(item.images) || !item.images.length) {
    return Response.json({ error: "Consultation result is required." }, { status: 400 });
  }

  const ownership = await verifyConsultationEmailOwnership(item.id, user.id);

  if (!ownership.allowed) {
    return Response.json(
      {
        reason: ownership.reason,
        sent: false,
      },
      { status: ownership.status },
    );
  }

  const share = await createEmailShareLink(ownership.sessionId, request.url);
  const emailItem: ConsultationEmailItem = {
    ...item,
    shareUrl: share.shareUrl ?? item.shareUrl,
  };
  const apiKey = readServerEnv("RESEND_API_KEY");
  const fromEmail = readServerEnv("RESEND_FROM_EMAIL");

  if (!apiKey) {
    await recordConsultationEmailEvent({
      errorMessage: "resend_not_configured",
      profileId: user.id,
      recipientEmail: to,
      sessionId: ownership.sessionId,
      shareToken: share.token,
      status: "failed",
    });

    return Response.json({
      reason: "resend_not_configured",
      sent: false,
    });
  }

  if (!fromEmail) {
    await recordConsultationEmailEvent({
      errorMessage: "resend_sender_not_configured",
      profileId: user.id,
      recipientEmail: to,
      sessionId: ownership.sessionId,
      shareToken: share.token,
      status: "failed",
    });

    return Response.json(
      {
        reason: "resend_sender_not_configured",
        sent: false,
      },
      { status: 503 },
    );
  }

  const attachments = await buildImageAttachments(emailItem);
  const totalBytes = attachments.reduce((sum, attachment) => {
    return sum + Buffer.byteLength(attachment.content, "base64");
  }, 0);

  if (totalBytes > maxAttachmentBytes) {
    return Response.json(
      {
        error:
          "상담 이미지 용량이 커서 이메일 첨부 한도를 넘었습니다. PDF 저장 또는 개별 이미지 저장을 이용해 주세요.",
      },
      { status: 413 },
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      attachments,
      from: fromEmail,
      html: buildConsultationEmailHtml(emailItem),
      subject: `미리룩 상담 결과 - ${sanitizeText(emailItem.styleName, 80)}`,
      text: buildConsultationEmailText(emailItem),
      to: [to],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const result = (await response.json().catch(() => ({}))) as ResendResponse;

  if (!response.ok) {
    console.error("Resend email failed", result);
    const resendMessage =
      sanitizeText(result.message, 240) ||
      sanitizeText(result.error, 240) ||
      sanitizeText(result.name, 120) ||
      `resend_http_${response.status}`;
    const reason = classifyResendFailure(resendMessage, response.status);

    await recordConsultationEmailEvent({
      errorMessage: resendMessage,
      profileId: user.id,
      recipientEmail: to,
      sessionId: ownership.sessionId,
      shareToken: share.token,
      status: "failed",
    });

    return Response.json(
      {
        reason,
        sent: false,
      },
      { status: response.status },
    );
  }

  await recordConsultationEmailEvent({
    profileId: user.id,
    recipientEmail: to,
    resendEmailId: result.id,
    sessionId: ownership.sessionId,
    shareToken: share.token,
    status: "sent",
  });

  return Response.json({
    emailId: result.id,
    shareUrl: emailItem.shareUrl,
    sent: true,
  });
}

async function verifyConsultationEmailOwnership(
  itemId: unknown,
  userId: string,
) {
  const sessionId = sanitizeSessionId(itemId);

  if (!sessionId) {
    return { allowed: true, sessionId: null, status: 200 };
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return { allowed: true, sessionId: null, status: 200 };
  }

  const result = await supabase
    .from("generation_sessions")
    .select("id, profile_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (result.error) {
    console.error("email consultation ownership lookup failed", result.error);

    return {
      allowed: false,
      reason: "supabase_lookup_failed",
      status: 500,
    };
  }

  if (!result.data) {
    return { allowed: true, sessionId: null, status: 200 };
  }

  if (result.data.profile_id !== userId) {
    return {
      allowed: false,
      reason: "not_owner",
      status: 403,
    };
  }

  return { allowed: true, sessionId, status: 200 };
}

function sanitizeEmail(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "";
  }

  return trimmed.slice(0, 254);
}

function classifyResendFailure(message: string | null, status: number) {
  const text = message ?? "";

  if (/domain|sender|from|verify|verified|onboarding|permission|access/i.test(text)) {
    return "resend_sender_rejected";
  }

  if (/recipient|to address|receiver|invalid email|suppression|bounce/i.test(text)) {
    return "resend_recipient_rejected";
  }

  if (status === 401 || status === 403) {
    return "resend_sender_rejected";
  }

  return "resend_send_failed";
}

async function buildImageAttachments(item: ConsultationEmailItem) {
  const attachments = await Promise.all(
    (item.images ?? []).slice(0, 9).map(async (image, index) => {
      const parsed =
        parseDataImage(image.imageUrl ?? "") ??
        (await fetchImageAttachment(image.imageUrl ?? ""));

      if (!parsed) {
        return null;
      }

      const label = sanitizeText(image.label, 40) || `image-${index + 1}`;
      const extension = parsed.mimeType === "image/png" ? "png" : "jpg";

      return {
        content: parsed.base64,
        filename: `mirilook-${String(index + 1).padStart(2, "0")}-${slugify(label)}.${extension}`,
      };
    }),
  );

  return attachments.filter(
    (attachment): attachment is { content: string; filename: string } =>
      Boolean(attachment),
  );
}

function buildConsultationEmailHtml(item: ConsultationEmailItem) {
  const imageRows = (item.images ?? [])
    .slice(0, 9)
    .map((image, index) => {
      const label = sanitizeText(image.label, 40) || `${index + 1}번 이미지`;

      return `<li>${escapeHtml(label)}</li>`;
    })
    .join("");
  const focusNames = sanitizeStringArray(item.consultingFocusNames, 8);
  const adviceRows = buildAdviceRows(item);

  return `
    <div style="font-family:Arial,sans-serif;background:#f6f0e6;padding:24px;color:#171511">
      <div style="max-width:720px;margin:0 auto;background:#fffaf1;border:1px solid #d8c6a3;border-radius:12px;padding:24px">
        <p style="margin:0 0 8px;color:#9b7435;font-size:13px;font-weight:700;letter-spacing:.08em">Miri Look</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.25">${escapeHtml(sanitizeText(item.styleName, 80) || "상담 결과")}</h1>
        <p style="margin:0 0 16px;color:#5b5144;line-height:1.7">고객 얼굴 사진을 기준으로 생성한 AI 헤어 상담 참고 자료입니다. 실제 시술 결과를 보장하지 않으며, 미용사 상담 시 얼굴형, 모발 상태, 손상도, 두상, 관리 난이도를 함께 확인해 주세요.</p>
        <table style="width:100%;border-collapse:collapse;margin:18px 0">
          <tbody>
            <tr><td style="padding:8px 0;color:#7a6a54">스타일</td><td style="padding:8px 0;font-weight:700">${escapeHtml(sanitizeText(item.styleName, 80) || "-")}</td></tr>
            <tr><td style="padding:8px 0;color:#7a6a54">헤어 컬러</td><td style="padding:8px 0;font-weight:700">${escapeHtml(sanitizeText(item.hairColorName, 80) || "-")}</td></tr>
            <tr><td style="padding:8px 0;color:#7a6a54">서비스 국가</td><td style="padding:8px 0;font-weight:700">${escapeHtml(sanitizeText(item.regionName, 40) || "한국")}</td></tr>
            <tr><td style="padding:8px 0;color:#7a6a54">추천 모드</td><td style="padding:8px 0;font-weight:700">${escapeHtml(sanitizeText(item.audienceName, 40) || "-")}</td></tr>
            <tr><td style="padding:8px 0;color:#7a6a54">업로드 사진</td><td style="padding:8px 0;font-weight:700">${normalizeCount(item.sourcePhotoCount)}장</td></tr>
          </tbody>
        </table>
        ${
          focusNames.length
            ? `<p style="margin:0 0 12px;color:#5b5144">반영 항목: ${escapeHtml(focusNames.join(" · "))}</p>`
            : ""
        }
        ${
          item.memo
            ? `<p style="margin:0 0 16px;color:#5b5144">요청 메모: ${escapeHtml(sanitizeText(item.memo, 800) || "")}</p>`
            : ""
        }
        ${
          item.styleReason
            ? `<p style="margin:0 0 16px;color:#5b5144">추천 이유: ${escapeHtml(sanitizeText(item.styleReason, 600) || "")}</p>`
            : ""
        }
        ${
          item.shareUrl
            ? `<p style="margin:0 0 16px"><a href="${escapeHtml(item.shareUrl)}" style="display:inline-block;background:#1a1712;color:#f3d28a;text-decoration:none;border-radius:8px;padding:12px 14px;font-weight:700">상담 보드 링크 열기</a></p>`
            : ""
        }
        ${
          adviceRows.length
            ? `<h2 style="font-size:18px;margin:20px 0 10px">상담 조언</h2>
        <table style="width:100%;border-collapse:collapse;margin:0 0 18px">
          <tbody>
            ${adviceRows
              .map(
                ([label, value]) =>
                  `<tr><td style="padding:8px 0;color:#7a6a54;width:96px">${escapeHtml(label)}</td><td style="padding:8px 0;font-weight:700;line-height:1.6">${escapeHtml(value)}</td></tr>`,
              )
              .join("")}
          </tbody>
        </table>`
            : ""
        }
        <h2 style="font-size:18px;margin:20px 0 10px">첨부 이미지</h2>
        <ol style="margin:0;padding-left:20px;color:#5b5144;line-height:1.8">${imageRows}</ol>
      </div>
    </div>
  `;
}

function buildConsultationEmailText(item: ConsultationEmailItem) {
  const labels = (item.images ?? [])
    .slice(0, 9)
    .map((image, index) => `${index + 1}. ${sanitizeText(image.label, 40) || "이미지"}`)
    .join("\n");

  return [
    "미리룩 상담 결과",
    `스타일: ${sanitizeText(item.styleName, 80) || "-"}`,
    `헤어 컬러: ${sanitizeText(item.hairColorName, 80) || "-"}`,
    `서비스 국가: ${sanitizeText(item.regionName, 40) || "한국"}`,
    `추천 모드: ${sanitizeText(item.audienceName, 40) || "-"}`,
    `업로드 사진: ${normalizeCount(item.sourcePhotoCount)}장`,
    item.styleReason ? `추천 이유: ${sanitizeText(item.styleReason, 600)}` : "",
    ...buildAdviceRows(item).map(([label, value]) => `${label}: ${value}`),
    item.shareUrl ? `상담 보드 링크: ${item.shareUrl}` : "",
    item.memo ? `요청 메모: ${sanitizeText(item.memo, 800)}` : "",
    "",
    "첨부 이미지",
    labels,
    "",
    "AI 이미지는 상담 참고용이며 실제 시술 결과를 보장하지 않습니다.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function createEmailShareLink(
  sessionId: string | null | undefined,
  requestUrl: string,
) {
  if (!sessionId) {
    return {
      shareUrl: "",
      token: null,
    };
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      shareUrl: "",
      token: null,
    };
  }

  const now = new Date().toISOString();
  const existing = await supabase
    .from("consultation_shares")
    .select("token, expires_at")
    .eq("session_id", sessionId)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    console.warn("email share lookup failed", existing.error);
  } else if (existing.data?.token) {
    return {
      shareUrl: buildEmailShareUrl(
        existing.data.token as string,
        requestUrl,
        existing.data.expires_at as string,
      ),
      token: existing.data.token as string,
    };
  }

  const token = createShareToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const insert = await supabase.from("consultation_shares").insert({
    expires_at: expiresAt,
    session_id: sessionId,
    token,
  });

  if (insert.error) {
    console.warn("email share create failed", insert.error);

    return {
      shareUrl: "",
      token: null,
    };
  }

  return {
    shareUrl: buildEmailShareUrl(token, requestUrl, expiresAt),
    token,
  };
}

function buildEmailShareUrl(token: string, requestUrl: string, expiresAt: string) {
  const url = new URL(`/share/${token}`, requestUrl);
  const version = new Date(expiresAt).getTime();

  if (Number.isFinite(version)) {
    url.searchParams.set("og", version.toString(36));
  }

  return url.toString();
}

async function recordConsultationEmailEvent(input: {
  errorMessage?: string | null;
  profileId: string;
  recipientEmail: string;
  resendEmailId?: string | null;
  sessionId?: string | null;
  shareToken?: string | null;
  status: "failed" | "sent";
}) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  const insert = await supabase.from("consultation_email_events").insert({
    error_message: input.errorMessage ?? null,
    profile_id: input.profileId,
    recipient_email: input.recipientEmail,
    resend_email_id: input.resendEmailId ?? null,
    session_id: input.sessionId ?? null,
    share_token: input.shareToken ?? null,
    status: input.status,
    updated_at: new Date().toISOString(),
  });

  if (insert.error) {
    console.warn("consultation email event insert failed", insert.error);
  }
}

function createShareToken() {
  return `fs_${crypto.randomUUID().replace(/-/g, "")}${crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 12)}`;
}

function buildAdviceRows(item: ConsultationEmailItem): Array<[string, string]> {
  return [
    ["시술 과정", sanitizeText(item.salonProcess, 400)],
    ["관리 포인트", sanitizeText(item.maintenanceAdvice, 400)],
    ["코디 추천", sanitizeText(item.outfitAdvice, 400)],
    ["메이크업 추천", sanitizeText(item.makeupAdvice, 400)],
  ].filter((row): row is [string, string] => Boolean(row[1]));
}

function parseDataImage(value: string) {
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png));base64,([a-zA-Z0-9+/=]+)$/);

  if (!match) {
    return null;
  }

  return {
    base64: match[2],
    mimeType: match[1] === "image/jpg" ? "image/jpeg" : match[1],
  };
}

async function fetchImageAttachment(value: string) {
  const url = parseAttachmentUrl(value);

  if (!url) {
    return null;
  }

  try {
    const response = await fetchAttachmentResponse(url);

    if (!response?.ok) {
      return null;
    }

    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim();

    if (contentType !== "image/jpeg" && contentType !== "image/png") {
      return null;
    }

    const contentLength = Number(response.headers.get("content-length"));

    if (Number.isFinite(contentLength) && contentLength > maxAttachmentFetchBytes) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.byteLength > maxAttachmentFetchBytes) {
      return null;
    }

    return {
      base64: buffer.toString("base64"),
      mimeType: contentType,
    };
  } catch (error) {
    console.warn("email image attachment fetch failed", error);
    return null;
  }
}

async function fetchAttachmentResponse(url: URL) {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount < 4; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get("location");

    if (!location) {
      return response;
    }

    const nextUrl = parseAttachmentUrl(new URL(location, currentUrl).toString());

    if (!nextUrl) {
      return null;
    }

    currentUrl = nextUrl;
  }

  return null;
}

function parseAttachmentUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" || isPrivateOrLocalHost(url.hostname)) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
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

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function sanitizeSessionId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  return /^[a-zA-Z0-9_-]{1,80}$/.test(trimmed) ? trimmed : "";
}

function sanitizeStringArray(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeCount(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(10, Math.round(parsed)));
}

function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "result"
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
