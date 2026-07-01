import { NextResponse } from "next/server";
import { getHairColorById } from "@/lib/mirilook-colors";
import {
  getRegionProfile,
  sanitizeRegion,
  type MirilookRegionId,
} from "@/lib/mirilook-regions";
import {
  getStyleById,
  getStylesByAudience,
  sanitizeAudience,
  type MirilookAudience,
  type MirilookStyle,
} from "@/lib/mirilook-styles";
import { editHairImage } from "@/lib/server/openai-image";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const startedAt = Date.now();
  let durationContext: Record<string, unknown> = {};
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 40 * 1024 * 1024,
    rateLimit: {
      key: "hairstyles:preview",
      limit: 24,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  try {
    if (!hasFormContentType(request)) {
      return NextResponse.json(
        { error: "정면 사진과 측면 사진이 모두 필요합니다." },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const front = formData.get("front");
    const side = formData.get("side");
    const leftSide = formData.get("leftSide");
    const rightSide = formData.get("rightSide");
    const celebrityReferences = formData
      .getAll("celebrityReferences")
      .filter(isImageFile)
      .slice(0, 9);
    const styleId = getString(formData.get("styleId"));
    const hairColorId = getString(formData.get("hairColorId"));
    const audience = sanitizeAudience(formData.get("audience"));
    const region = sanitizeRegion(formData.get("region"));
    const styleMemo = sanitizeStyleMemo(formData.get("styleMemo"));
    const previewIndex = Number(formData.get("previewIndex") ?? 0);
    const style = resolveRequestedStyle({
      audience,
      celebrityReferenceCount: celebrityReferences.length,
      formData,
      styleId,
    });
    const hairColor =
      getHairColorById(hairColorId) ?? getHairColorById("natural-black");
    durationContext = {
      audience,
      celebrityReferenceCount: celebrityReferences.length,
      previewIndex,
      region,
      styleId,
    };

    if (!(front instanceof File) || !(side instanceof File)) {
      return NextResponse.json(
        { error: "정면 사진과 측면 사진이 모두 필요합니다." },
        { status: 400 },
      );
    }

    if (
      !style ||
      !hairColor
    ) {
      return NextResponse.json(
        { error: "선택한 서비스 모드에서 지원하지 않는 헤어스타일 또는 컬러입니다." },
        { status: 400 },
      );
    }

    const stylePrompt = buildStylePrompt(style.prompt, hairColor.prompt, styleMemo);
    const generationStartedAt = Date.now();

    const imageUrl = await editHairImage({
      costLabel: "preview",
      front,
      leftSide: leftSide instanceof File ? leftSide : undefined,
      rightSide: rightSide instanceof File ? rightSide : undefined,
      side,
      source: "both",
      size: process.env.OPENAI_PREVIEW_IMAGE_SIZE ?? "1024x1024",
      styleReferences: celebrityReferences,
      prompt: buildPreviewPrompt(
        audience,
        region,
        style.name,
        stylePrompt,
        style.previewPrompt,
        previewIndex,
        celebrityReferences.length,
      ),
    });
    logApiDuration("hairstyles/preview", startedAt, {
      ...durationContext,
      generationElapsedMs: Date.now() - generationStartedAt,
      status: "ok",
    });

    return NextResponse.json({
      mode: "live",
      style: {
        id: styleId,
        name: style.name,
      },
      imageUrl,
    });
  } catch (error) {
    console.error(error);
    logApiDuration("hairstyles/preview", startedAt, {
      ...durationContext,
      error: getErrorMessage(error),
      status: "error",
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "헤어스타일 미리보기 생성에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}

function logApiDuration(
  route: string,
  startedAt: number,
  context: Record<string, unknown>,
) {
  console.info("mirilook api duration", {
    route,
    elapsedMs: Date.now() - startedAt,
    ...context,
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function buildPreviewPrompt(
  audience: MirilookAudience,
  region: MirilookRegionId,
  styleName: string,
  stylePrompt: string,
  previewPrompt: string,
  previewIndex: number,
  celebrityReferenceCount: number,
) {
  const anglePrompt = getPreviewAnglePrompt(previewIndex);
  const regionProfile = getRegionProfile(region);
  const audienceInstruction =
    audience === "female"
      ? "Service mode: women's salon recommendation. Preserve customer-presented styling cues, face fullness, makeup/no-makeup tone, and clothing mood. Emphasize length, layers, bangs, face-framing pieces, curl size, hair ends, gloss, personal-color harmony, and salon maintenance. Do not masculinize the face or turn the requested women's hairstyle into a men's shortcut unless the selected style explicitly says pixie or short cut."
      : "Service mode: men's grooming recommendation. Emphasize side volume, fringe, parting, taper/down-perm needs, hairline, crown lift, and grooming manageability.";

  return `
Create one realistic AI hairstyle try-on portrait for a premium salon consultation.
High-speed pilot render mode: use a clean simple salon background, avoid complex props, avoid extra styling experiments, and return one decisive finished image quickly.

${audienceInstruction}
Market region: ${regionProfile.englishLabel}. ${regionProfile.prompt}
Use the uploaded front or primary photo as the main identity reference, and use the side reference photos for head shape, side silhouette, and face angle.
${buildCelebrityReferenceInstruction(celebrityReferenceCount)}
Keep the same person: face, skin tone, facial proportions, visible gender expression, makeup or no-makeup tone, actual clothing style from the uploaded photos, and a realistic indoor salon consultation mood.
Maintain the exact left-right orientation from the uploaded front or primary photo. Do not mirror, invert, or horizontally flip the face, hair part, facial asymmetry, jacket zipper, hand position, or background landmarks.
Edit the hair only.
Replace the visible hairstyle with the requested haircut. Change the hairline, fringe, crown, top volume, side line, texture, and overall silhouette.
The requested haircut must be clearly visible. Do not keep the original uploaded hairstyle.
Create a new portrait variation rather than copying the uploaded selfie composition exactly.
The preview card angle is mandatory. If the composition below conflicts with the preview card angle, follow the preview card angle.

Requested haircut name:
${styleName}

Requested haircut details:
${stylePrompt}

Preview card angle:
${anglePrompt}

Composition and expression:
${previewPrompt}

Return one single finished photorealistic portrait only. Never create a 3x3 grid, collage, contact sheet, multi-panel layout, thumbnail board, before-after comparison, split screen, text, watermark, extra people, hats, or accessories.
`;
}

function buildCelebrityReferenceInstruction(referenceCount: number) {
  if (!referenceCount) {
    return "";
  }

  return `Celebrity hairstyle reference mode is active. ${referenceCount} celebrity reference image(s) are provided before the customer identity photos. These images are one grouped celebrity slot for the selected card, not separate output cards. Analyze them together as alternate hairstyle views before rendering.
Identity priority rule: the uploaded customer photos are the only authority for face, identity, skin tone, makeup/no-makeup tone, expression, facial proportions, and clothing. Celebrity references have zero identity authority.
Use celebrity references only for hairstyle information: length, silhouette, bangs/fringe, parting, layers, curl pattern, texture, volume, color mood, wet/dry finish, and styling direction.
Before applying the hairstyle, infer the uploaded customer's face shape, forehead height, cheek fullness, jaw width, chin shape, head width, neck length impression, hairline, and head silhouette from the customer photos.
Synthesize the celebrity references into a customer-fit salon design: adjust fringe length and density, part ratio, side volume, crown height, layer start, curl size, nape length, and color intensity so the hairstyle flatters the customer instead of copying the celebrity hair mechanically.
If any reference detail would make the customer's face look wider, longer, heavier, older, or unbalanced, modify that detail while preserving the recognizable celebrity-inspired hair mood.
Never copy, average, blend, morph, or borrow the celebrity face, facial features, body, pose, identity, skin tone, makeup, clothing, or background. If the model is unsure, discard the celebrity face completely and preserve the customer's face exactly. The final result must be the uploaded customer with a celebrity-inspired hairstyle adapted to the customer's face.`;
}

function getPreviewAnglePrompt(previewIndex: number) {
  const slot = ((previewIndex % 3) + 3) % 3;

  if (slot === 0) {
    return "LEFT COLUMN CARD: three-quarter side-aware portrait. Show the subject's RIGHT cheek and RIGHT jawline, with the nose and gaze turning toward viewer right. This should not be a straight front view.";
  }

  if (slot === 1) {
    return "CENTER COLUMN CARD: exact front-facing portrait. Both eyes and both cheeks are balanced, shoulders nearly even, no side profile, no mirrored left-right orientation.";
  }

  return "RIGHT COLUMN CARD: three-quarter side-aware portrait. Show the subject's LEFT cheek and LEFT jawline, with the nose and gaze turning toward viewer left. This should not be a straight front view.";
}

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isImageFile(value: FormDataEntryValue): value is File {
  return value instanceof File && value.size > 0;
}

function resolveRequestedStyle({
  audience,
  celebrityReferenceCount,
  formData,
  styleId,
}: {
  audience: MirilookAudience;
  celebrityReferenceCount: number;
  formData: FormData;
  styleId: string;
}): MirilookStyle | null {
  const catalogStyle = getStyleById(styleId);

  if (
    catalogStyle &&
    getStylesByAudience(audience).some((item) => item.id === catalogStyle.id)
  ) {
    return catalogStyle;
  }

  if (!isCelebrityReferenceStyleId(styleId) || !celebrityReferenceCount) {
    return null;
  }

  const name = sanitizeCustomStyleText(
    formData.get("customStyleName"),
    "연예인 헤어 레퍼런스",
    80,
  );
  const prompt = sanitizeCustomStyleText(
    formData.get("customStylePrompt"),
    "Analyze all uploaded celebrity references together for hairstyle attributes, infer the customer's face shape from uploaded photos, adapt fringe, parting, side volume, crown height, layers, curls, nape length, and color intensity to suit the customer, and apply the adjusted hairstyle naturally while preserving customer identity.",
    1800,
  );
  const previewPrompt = sanitizeCustomStyleText(
    formData.get("customStylePreviewPrompt"),
    "Premium front three-quarter portrait of the customer with the reference hairstyle translated naturally.",
    400,
  );
  const reason = sanitizeCustomStyleText(
    formData.get("customStyleReason"),
    "연예인 사진의 헤어만 참고해 고객 얼굴에 자연스럽게 얹어보는 레퍼런스입니다.",
    220,
  );

  return {
    accent: "from-[#9cc8ff]/24",
    cropClass: "scale-100",
    id: styleId || "celebrity-reference",
    name,
    previewPrompt,
    prompt,
    reason,
    tags: ["레퍼런스", "헤어만 반영", "고객 얼굴 유지"],
  };
}

function isCelebrityReferenceStyleId(styleId: string) {
  return styleId === "celebrity-reference" || styleId.startsWith("celebrity-reference-");
}

function sanitizeCustomStyleText(
  value: FormDataEntryValue | null,
  fallback: string,
  maxLength: number,
) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.replace(/[<>]/g, "").trim();

  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function sanitizeStyleMemo(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[<>]/g, "").trim().slice(0, 720);
}

function buildStylePrompt(
  stylePrompt: string,
  hairColorPrompt: string,
  styleMemo: string,
) {
  return [
    stylePrompt,
    `Hair color instruction: ${hairColorPrompt}`,
    styleMemo ? `Customer request memo: ${styleMemo}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function hasFormContentType(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  return (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  );
}
