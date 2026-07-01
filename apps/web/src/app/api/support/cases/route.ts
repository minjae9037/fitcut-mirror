import { queueNotificationEvent } from "@/lib/server/notifications";
import { readServerEnv } from "@/lib/server/env";
import { protectMutationRequest } from "@/lib/server/request-security";
import {
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 30;

type SupportCasePayload = {
  body?: string;
  caseType?: string;
  contactEmail?: string;
  contactPhone?: string;
  paymentId?: string;
  priority?: string;
  refundAmountHm?: number | string;
  requestId?: string;
  sourceId?: string;
  sourceType?: string;
  subject?: string;
};

type ResendResponse = {
  error?: string;
  id?: string;
  message?: string;
  name?: string;
};

type SupportCaseEmailInput = {
  adminUrl: string;
  body: string;
  caseId: string;
  caseType: string;
  contactEmail: string | null;
  contactPhone: string | null;
  paymentId: string | null;
  priority: string;
  requestId: string | null;
  sourceType: string | null;
  subject: string;
  userEmail: string | null;
};

const allowedCaseTypes = new Set([
  "generation_failure",
  "refund_request",
  "payment_issue",
  "account_issue",
  "data_deletion",
  "general_inquiry",
]);

const allowedPriorities = new Set(["low", "normal", "high", "urgent"]);
// 문의 접수 메일 수신처. 대표 지메일(우선) + 공식 지원 인박스(사본).
const supportInboxEmails = ["minjae9037@gmail.com", "jipsa.admin@gmail.com"];

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 64 * 1024,
    rateLimit: {
      key: "support:cases",
      limit: 12,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: SupportCasePayload;

  try {
    payload = (await request.json()) as SupportCasePayload;
  } catch {
    return Response.json({ error: "Invalid support case payload." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({
      accepted: false,
      reason: "supabase_not_configured",
    });
  }

  const user = await getVerifiedSupabaseUser(request);
  const caseType = sanitizeCaseType(payload.caseType);
  const contactEmail = sanitizeEmail(payload.contactEmail) ?? user?.email ?? null;
  const contactPhone = sanitizeText(payload.contactPhone, 80);
  const subject = sanitizeText(payload.subject, 140);
  const body = sanitizeText(payload.body, 2000);
  const paymentId = sanitizeText(payload.paymentId, 160);
  const priority = sanitizePriority(payload.priority, caseType);
  const requestId = sanitizeText(payload.requestId, 160);
  const sourceId = sanitizeText(payload.sourceId, 160);
  const sourceType = sanitizeText(payload.sourceType, 80);
  const isHomeContactInquiry =
    caseType === "general_inquiry" && sourceType === "home_contact";

  if (!subject || !body) {
    return Response.json(
      { error: "Subject and body are required." },
      { status: 400 },
    );
  }

  if (isHomeContactInquiry && !contactEmail) {
    return Response.json(
      { error: "Valid contact email is required." },
      { status: 400 },
    );
  }

  if (!user && !contactEmail && !contactPhone && !isHomeContactInquiry) {
    return Response.json(
      { error: "Contact email or phone is required." },
      { status: 400 },
    );
  }

  const insert = await supabase
    .from("support_cases")
    .insert({
      body,
      case_type: caseType,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      metadata: {
        userAgent: sanitizeText(request.headers.get("user-agent"), 240),
      },
      payment_id: paymentId,
      priority,
      profile_id: user?.id ?? null,
      refund_amount_hm: normalizeRefundAmount(payload.refundAmountHm),
      request_id: requestId,
      source_id: sourceId,
      source_type: sourceType,
      status: "new",
      subject,
    })
    .select("id")
    .single();

  if (insert.error) {
    console.error("support case insert failed", insert.error);

    return Response.json(
      {
        accepted: false,
        reason: "support_case_insert_failed",
      },
      { status: 500 },
    );
  }

  const caseId = insert.data.id;
  const notification = await queueNotificationEvent({
    body: `${caseTypeLabel(caseType)} 문의가 접수되었습니다. ${subject}`,
    eventType: "support_case",
    payload: {
      caseId,
      caseType,
      contactEmail,
      contactPhone,
      paymentId,
      requestId,
      sourceType,
    },
    targetProfileId: user?.id,
    title: "고객지원 문의 접수",
    url: "/admin",
  });
  const email = await sendSupportCaseEmail({
    adminUrl: new URL("/admin", request.url).toString(),
    body,
    caseId,
    caseType,
    contactEmail,
    contactPhone,
    paymentId,
    priority,
    requestId,
    sourceType,
    subject,
    userEmail: user?.email ?? null,
  });

  return Response.json({
    accepted: true,
    caseId,
    emailId: email.emailId,
    emailReason: email.sent ? undefined : email.reason,
    emailSent: email.sent,
    notificationQueued: notification.queued,
    notificationReason: notification.queued ? undefined : notification.reason,
  });
}

function sanitizeCaseType(value: unknown) {
  const text = sanitizeText(value, 80);

  return text && allowedCaseTypes.has(text) ? text : "general_inquiry";
}

function sanitizePriority(value: unknown, caseType: string) {
  const text = sanitizeText(value, 30);

  if (text && allowedPriorities.has(text)) {
    return text;
  }

  return caseType === "generation_failure" || caseType === "payment_issue"
    ? "high"
    : "normal";
}

function normalizeRefundAmount(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}

function sanitizeEmail(value: unknown) {
  const text = sanitizeText(value, 180);

  if (!text) {
    return null;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : null;
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.replace(/[<>]/g, "").trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function caseTypeLabel(value: string) {
  switch (value) {
    case "generation_failure":
      return "생성 실패";
    case "refund_request":
      return "환불";
    case "payment_issue":
      return "결제";
    case "account_issue":
      return "계정";
    case "data_deletion":
      return "데이터 삭제";
    default:
      return "일반";
  }
}

async function sendSupportCaseEmail(input: SupportCaseEmailInput) {
  const apiKey = readServerEnv("RESEND_API_KEY");
  const fromEmail = readServerEnv("RESEND_FROM_EMAIL");

  if (!apiKey) {
    return { reason: "resend_not_configured", sent: false };
  }

  if (!fromEmail) {
    return { reason: "resend_sender_not_configured", sent: false };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from: fromEmail,
        html: buildSupportCaseEmailHtml(input),
        subject: `[미리룩 문의] ${input.subject}`,
        text: buildSupportCaseEmailText(input),
        to: supportInboxEmails,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const result = (await response.json().catch(() => ({}))) as ResendResponse;

    if (!response.ok) {
      const reason =
        sanitizeText(result.message, 240) ||
        sanitizeText(result.error, 240) ||
        sanitizeText(result.name, 120) ||
        `resend_http_${response.status}`;

      console.error("support case email failed", {
        caseId: input.caseId,
        reason,
      });

      return { reason, sent: false };
    }

    return { emailId: result.id, sent: true };
  } catch (error) {
    console.error("support case email request failed", error);

    return { reason: "resend_request_failed", sent: false };
  }
}

function buildSupportCaseEmailText(input: SupportCaseEmailInput) {
  const lines = [
    "미리룩 고객 문의가 접수되었습니다.",
    "",
    `접수번호: ${input.caseId}`,
    `유형: ${caseTypeLabel(input.caseType)}`,
    `우선순위: ${input.priority}`,
    `회원 이메일: ${input.userEmail ?? "-"}`,
    `회신 이메일: ${input.contactEmail ?? "-"}`,
    `추천 요청 ID: ${input.requestId ?? "-"}`,
    `결제 ID: ${input.paymentId ?? "-"}`,
    `유입: ${input.sourceType ?? "-"}`,
    "",
    "문의 내용:",
    input.body,
    "",
    `관리자 화면: ${input.adminUrl}`,
  ];

  if (input.contactPhone) {
    lines.splice(7, 0, `회신 전화: ${input.contactPhone}`);
  }

  return lines.join("\n");
}

function buildSupportCaseEmailHtml(input: SupportCaseEmailInput) {
  const rows = [
    ["접수번호", input.caseId],
    ["유형", caseTypeLabel(input.caseType)],
    ["우선순위", input.priority],
    ["회원 이메일", input.userEmail ?? "-"],
    ["회신 이메일", input.contactEmail ?? "-"],
    ...(input.contactPhone ? [["회신 전화", input.contactPhone]] : []),
    ["추천 요청 ID", input.requestId ?? "-"],
    ["결제 ID", input.paymentId ?? "-"],
    ["유입", input.sourceType ?? "-"],
  ];

  return `
    <main style="font-family:Arial,Helvetica,sans-serif;background:#fffaf1;color:#171511;padding:24px">
      <section style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #ead8b5;border-radius:12px;padding:24px">
        <p style="margin:0 0 8px;color:#9a6b18;font-weight:700">Miri Look Support</p>
        <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3">미리룩 고객 문의 접수</h1>
        <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
          <tbody>
            ${rows
              .map(
                ([label, value]) => `
                  <tr>
                    <td style="padding:8px 0;color:#7a6a54;width:112px">${escapeHtml(label)}</td>
                    <td style="padding:8px 0;font-weight:700">${escapeHtml(value)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
        <div style="border:1px solid #ead8b5;border-radius:10px;background:#fff8e8;padding:16px">
          <p style="margin:0 0 8px;font-weight:700">문의 내용</p>
          <p style="margin:0;white-space:pre-line;line-height:1.65">${escapeHtml(input.body)}</p>
        </div>
        <p style="margin:20px 0 0">
          <a href="${escapeHtml(input.adminUrl)}" style="display:inline-block;background:#171511;color:#f3d28a;text-decoration:none;border-radius:8px;padding:12px 14px;font-weight:700">관리자 화면에서 확인</a>
        </p>
      </section>
    </main>
  `;
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
