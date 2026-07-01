import { randomUUID } from "node:crypto";
import {
  getConsultationStorageBucket,
  getSupabaseAdminClient,
} from "@/lib/server/supabase-admin";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

// Google Lens can only search images it can fetch over http(s). The studio's
// generated outfit/makeup images live in the browser as data URLs, so this
// endpoint stores one temporarily in Supabase and returns a short-lived signed
// URL the client can hand to Google Lens.
export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 20 * 1024 * 1024,
    rateLimit: {
      key: "tools:lens-image",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }

  let body: { dataUrl?: string };

  try {
    body = (await request.json()) as { dataUrl?: string };
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = parseDataImage(body.dataUrl ?? "");

  if (!parsed) {
    return Response.json({ error: "invalid_image" }, { status: 400 });
  }

  const bucket = getConsultationStorageBucket();
  const extension = parsed.mimeType === "image/png" ? "png" : "jpg";
  const storagePath = `lens-temp/${randomUUID()}.${extension}`;

  const upload = await supabase.storage.from(bucket).upload(storagePath, parsed.buffer, {
    cacheControl: "3600",
    contentType: parsed.mimeType,
    upsert: true,
  });

  if (upload.error) {
    console.error("lens-image upload failed", upload.error);
    return Response.json({ error: "upload_failed" }, { status: 500 });
  }

  const signed = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600);

  if (!signed.data?.signedUrl) {
    return Response.json({ error: "sign_failed" }, { status: 500 });
  }

  return Response.json({ url: signed.data.signedUrl });
}

function parseDataImage(value: string) {
  const match = value.match(
    /^data:(image\/(?:jpeg|jpg|png));base64,([a-zA-Z0-9+/=]+)$/,
  );

  if (!match) {
    return null;
  }

  return {
    buffer: Buffer.from(match[2], "base64"),
    mimeType: match[1] === "image/jpg" ? "image/jpeg" : match[1],
  };
}
