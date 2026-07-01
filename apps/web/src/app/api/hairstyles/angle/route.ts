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
  resultAngles,
  sanitizeAudience,
  type MirilookAudience,
  type MirilookStyle,
} from "@/lib/mirilook-styles";
import {
  editFinalHairImage,
  getFinalImageProvider,
} from "@/lib/server/final-image-renderer";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 60;

type AnglePhotoSlot = "left" | "front" | "right" | "side";

type AnglePhotoContext = {
  hasActualFront: boolean;
  primaryReferenceSlot: AnglePhotoSlot;
  secondaryReferenceSlot: AnglePhotoSlot;
  uploadedSlots: AnglePhotoSlot[];
};

export async function POST(request: Request) {
  const startedAt = Date.now();
  let durationContext: Record<string, unknown> = {};
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 48 * 1024 * 1024,
    rateLimit: {
      key: "hairstyles:angle",
      limit: 30,
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
    const base = formData.get("base");
    const baseReferences = formData.getAll("baseReferences").filter(isFile);
    const front = formData.get("front");
    const side = formData.get("side");
    const leftSide = formData.get("leftSide");
    const rightSide = formData.get("rightSide");
    const photoContext = sanitizePhotoContext(formData.get("photoContext"));
    const celebrityReferences = formData
      .getAll("celebrityReferences")
      .filter(isFile)
      .slice(0, 9);
    const styleId = getString(formData.get("styleId"));
    const hairColorId = getString(formData.get("hairColorId"));
    const audience = sanitizeAudience(formData.get("audience"));
    const region = sanitizeRegion(formData.get("region"));
    const styleMemo = sanitizeStyleMemo(formData.get("styleMemo"));
    const referenceRole = sanitizeReferenceRole(formData.get("referenceRole"));
    const angleIndex = Number(formData.get("angleIndex") ?? -1);
    const style = resolveRequestedStyle({
      audience,
      celebrityReferenceCount: celebrityReferences.length,
      formData,
      styleId,
    });
    const hairColor =
      getHairColorById(hairColorId) ?? getHairColorById("natural-black");
    const angle = resultAngles[angleIndex];
    durationContext = {
      angleIndex,
      audience,
      baseReferenceCount:
        (base instanceof File ? 1 : 0) + baseReferences.length,
      celebrityReferenceCount: celebrityReferences.length,
      referenceRole,
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
      !hairColor ||
      !angle
    ) {
      return NextResponse.json(
        { error: "선택한 서비스 모드에서 지원하지 않는 헤어스타일, 컬러 또는 각도입니다." },
        { status: 400 },
      );
    }

    const stylePrompt = buildStylePrompt(style.prompt, hairColor.prompt, styleMemo);

    const provider = getFinalImageProvider();
    const baseReferenceCount = (base instanceof File ? 1 : 0) + baseReferences.length;
    durationContext = {
      ...durationContext,
      angleLabel: angle.label,
      provider,
      source: angle.source,
    };

    console.info("mirilook angle generation request", {
      angleIndex,
      angleLabel: angle.label,
      baseReferenceCount,
      celebrityReferenceCount: celebrityReferences.length,
      hasActualFront: photoContext.hasActualFront,
      provider,
      referenceRole,
      source: angle.source,
      styleId,
      uploadedSlots: photoContext.uploadedSlots,
    });

    const generationStartedAt = Date.now();
    const imageUrl = await editFinalHairImage({
      base: base instanceof File ? base : undefined,
      baseReferences,
      costLabel: "final-angle",
      front,
      leftSide: leftSide instanceof File ? leftSide : undefined,
      rightSide: rightSide instanceof File ? rightSide : undefined,
      side,
      source: angle.source,
      size: process.env.OPENAI_ANGLE_IMAGE_SIZE ?? "1024x1024",
      styleReferences: celebrityReferences,
      prompt: buildAnglePrompt(
        audience,
        region,
        angle.label,
        style.name,
        stylePrompt,
        angle.prompt,
        photoContext,
        base instanceof File || baseReferences.length > 0,
        referenceRole,
        baseReferenceCount,
        celebrityReferences.length,
      ),
    });
    logApiDuration("hairstyles/angle", startedAt, {
      ...durationContext,
      generationElapsedMs: Date.now() - generationStartedAt,
      status: "ok",
    });

    return NextResponse.json({
      mode: "live",
      provider,
      label: angle.label,
      imageUrl,
    });
  } catch (error) {
    console.error(error);
    logApiDuration("hairstyles/angle", startedAt, {
      ...durationContext,
      error: getErrorMessage(error),
      status: "error",
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "각도 이미지 생성에 실패했습니다.",
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

function buildAnglePrompt(
  audience: MirilookAudience,
  region: MirilookRegionId,
  angleLabel: string,
  styleName: string,
  stylePrompt: string,
  anglePrompt: string,
  photoContext: AnglePhotoContext,
  hasBaseReference: boolean,
  referenceRole: string,
  baseReferenceCount: number,
  celebrityReferenceCount: number,
) {
  const regionProfile = getRegionProfile(region);
  const audienceInstruction =
    audience === "female"
      ? "Service mode: women's salon consultation. Preserve the customer's visible gender expression, face fullness, makeup/no-makeup tone, and clothing mood. Make the requested women's hairstyle readable for a stylist: length, layers, bangs, face-framing pieces, curl size, ends, shine, personal-color harmony, salon maintenance cues, and back silhouette must be clear. Do not masculinize the face or make the person slimmer/heavier."
      : "Service mode: men's grooming consultation. Make the requested men's hairstyle readable for a stylist: side line, fringe, parting, taper/down-perm need, crown lift, nape, hairline, and manageability must be clear.";

  return `
Create a photorealistic premium salon consultation reference image.
High-speed pilot render mode: use a clean simple salon background, avoid complex props, avoid extra styling experiments, and return one decisive finished image quickly.

${audienceInstruction}
Market region: ${regionProfile.englishLabel}. ${regionProfile.prompt}
Use the uploaded photos as identity references.
${buildPhotoContextInstruction(photoContext)}
${hasBaseReference ? "Generated stage references are provided before the original customer photos. They may include the selected recommendation image, the canonical front image, left/front/right base images, top crown image, or rear image. Use generated stage references for hairstyle continuity, camera-angle continuity, clothing mood, and lighting continuity. They may contain AI drift, so the original uploaded customer photos remain the authority for facial identity, face shape, skin tone, facial asymmetry, and real clothing details. If a generated reference conflicts with the original customer's face, correct the output back toward the original customer. Never mirror, invert, or horizontally flip any reference." : ""}
${buildCelebrityReferenceInstruction(celebrityReferenceCount)}
${buildReferenceRoleInstruction(referenceRole, baseReferenceCount)}
Preserve the same person: facial identity, face shape, skin tone, visible gender expression, makeup or no-makeup tone, actual clothing style from the uploaded photos, and overall realistic appearance.
Maintain the exact left-right orientation from the uploaded references. Do not horizontally flip the face, hair part, hair flow, facial asymmetry, jacket zipper, hand position, or background landmarks.
Facial consistency is more important than beautification. Do not make the face slimmer, wider, older, younger, heavier, thinner, sharper, softer, more handsome, or more doll-like.
Keep the same cheek fullness, jaw width, chin shape, nose size, eye spacing, eyelid shape, mouth shape, facial asymmetry, and natural expression tone from the uploaded identity references.
Replace the entire visible hairstyle with the requested style: hairline, fringe, crown, top volume, side line, texture, and silhouette.
The final image must visibly show the requested hairstyle and must not keep the original uploaded hairstyle.
Hair length and silhouette lock: all nine consultation angles must depict ONE single haircut with the exact same hair length, overall volume, and outer silhouette. ${hasBaseReference ? "The selected recommendation/base reference defines the authoritative hair LENGTH for this style: if the reference hair reaches the shoulders or longer, this angle must show that same long length; if the reference hair is short above the ears, this angle must be that same short length." : "Decide the hair length once from the requested style and keep it identical on every angle."} Never switch between long and short hair, never shorten or lengthen the hair, and never crop the hair length differently between angles. A long style stays long from every camera position; a short style stays short from every camera position.
Keep the image suitable for a hair stylist to understand the cut and styling direction.
Keep face and clothing tone consistent with the selected style reference, while changing camera angle and expression enough to avoid duplicate-looking images.
For crown, rear, rear-three-quarter, and strict side profile requests, the camera position is more important than showing the full face. It is acceptable for the face to be partly hidden or not visible when the requested stylist reference angle requires it.

Hairstyle name:
${styleName}

Hairstyle details:
${stylePrompt}

View angle:
${anglePrompt}

Non-negotiable angle contract:
${buildAngleContract(angleLabel)}

The requested camera position is mandatory.
If the selected hairstyle reference is not front-facing and this request asks for the CENTER or a front-facing slot, rotate the same face and hairstyle into an exact front-facing portrait. Do not keep the selected reference's side gaze for a front-facing slot.
This request is for one image that will be placed into a larger app grid later. Do not draw the app grid.
Never mirror the same side for every result. If this request says customer's LEFT side, LEFT profile, or LEFT-REAR, that side must dominate. If this request says customer's RIGHT side, RIGHT profile, or RIGHT-REAR, that side must dominate. If this request says CENTER or exact front-facing, both eyes and both cheeks must be balanced. If this request says TOP CENTER, show the crown from above. If this request says REAR CENTER or BOTTOM CENTER, show the rear/back view with no face.
Single finished portrait only. Never create a 3x3 grid, collage, contact sheet, multi-panel layout, thumbnail board, before-after comparison, split screen, text, watermark, extra people, hats, or sunglasses.
`;
}

function buildPhotoContextInstruction(photoContext: AnglePhotoContext) {
  const uploadedSlots = photoContext.uploadedSlots.length
    ? photoContext.uploadedSlots.join(", ")
    : "unknown";

  if (photoContext.hasActualFront) {
    return `Photo context: an actual front-facing customer photo is available. For exact front-facing or center requests, treat the original front photo as the highest-priority facial identity source. Use generated recommendation or stage references only to transfer the chosen hairstyle, hair color, and salon mood. Uploaded customer slots: ${uploadedSlots}.`;
  }

  return `Photo context: a confirmed front-facing customer photo was not provided. Preserve identity from all original uploaded customer photos, avoid inventing new face proportions, and do not let generated recommendation references override the customer's real facial structure. Uploaded customer slots: ${uploadedSlots}.`;
}

function buildCelebrityReferenceInstruction(referenceCount: number) {
  if (!referenceCount) {
    return "";
  }

  return `Celebrity hairstyle reference mode is active. ${referenceCount} celebrity reference image(s) are provided before the customer identity photos. These images are one grouped celebrity slot for the selected card, not separate output cards. Analyze them together as alternate hairstyle views before rendering.
Identity priority rule: the original uploaded customer photos are the only authority for face, identity, skin tone, makeup/no-makeup tone, expression, facial proportions, and real clothing. Celebrity references have zero identity authority, and generated stage references may contain drift.
Use celebrity references only for hairstyle attributes: length, silhouette, bangs/fringe, parting, layers, curl pattern, texture, volume, color mood, wet/dry finish, and styling direction.
Before applying the hairstyle, infer the uploaded customer's face shape, forehead height, cheek fullness, jaw width, chin shape, head width, neck length impression, hairline, and head silhouette from the customer photos and generated stage references.
Synthesize the celebrity references into a customer-fit salon design: adjust fringe length and density, part ratio, side volume, crown height, layer start, curl size, nape length, and color intensity so the hairstyle flatters the customer instead of copying the celebrity hair mechanically.
If any reference detail would make the customer's face look wider, longer, heavier, older, or unbalanced, modify that detail while preserving the recognizable celebrity-inspired hair mood.
Never copy, average, blend, morph, or borrow the celebrity face, facial features, body, pose, identity, skin tone, makeup, clothing, or background. If any reference conflicts with the customer's face, discard the celebrity face completely and correct back to the original customer. The final result must be the uploaded customer with the reference hairstyle adapted naturally across the requested stylist angle.`;
}

function buildAngleContract(angleLabel: string) {
  switch (angleLabel) {
    case "좌상단":
      return [
        "SLOT = UPPER_LEFT_DIAGONAL.",
        "Camera position: high front diagonal; this image will sit in the upper-left of the 3x3 board.",
        "The subject must face toward the grid center, not straight toward the viewer.",
        "Show a high three-quarter temple/crown view with one cheek and jaw edge visible.",
        "Do not render a strict front portrait, strict side profile, rear view, or overhead top-only crown.",
      ].join("\n");
    case "상단":
      return [
        "SLOT = TOP_CENTER_OVERHEAD.",
        "Camera position: directly above the customer's head, like a ceiling camera or drone looking down at the crown.",
        "The crown, part line, hair whorl, fringe direction, top volume, and hair texture must dominate.",
        "Eyes, nose, mouth, and full face should be barely visible or not visible.",
        "Do not render a front portrait, side profile, or rear view.",
      ].join("\n");
    case "우상단":
      return [
        "SLOT = UPPER_RIGHT_DIAGONAL.",
        "Camera position: high front diagonal; this image will sit in the upper-right of the 3x3 board.",
        "The subject must face toward the grid center, not straight toward the viewer.",
        "Show the opposite high three-quarter temple/crown direction from UPPER_LEFT_DIAGONAL.",
        "Do not render a strict front portrait, strict side profile, rear view, or overhead top-only crown.",
      ].join("\n");
    case "좌측":
      return [
        "SLOT = MIDDLE_LEFT_STRICT_PROFILE.",
        "Camera position: customer's own LEFT side, eye-level 90-degree profile.",
        "The customer's left ear, left temple, sideburn, side hairline, side volume, and nape line must be clearly visible.",
        "The nose should point toward viewer right.",
        "Do not render a three-quarter view, front portrait, rear view, or mirrored right profile.",
      ].join("\n");
    case "정면":
      return [
        "SLOT = CENTER_EXACT_FRONT.",
        "Camera position: exact front-facing, eye-level, passport/headshot-like symmetry.",
        "Both eyes, both cheeks, both eyebrows, and both shoulders should be balanced.",
        "Use the original uploaded front photo as the facial identity authority when available.",
        "Do not render side gaze, profile, high angle, low angle, or mirrored orientation.",
      ].join("\n");
    case "우측":
      return [
        "SLOT = MIDDLE_RIGHT_STRICT_PROFILE.",
        "Camera position: customer's own RIGHT side, eye-level 90-degree profile.",
        "The customer's right ear, right temple, sideburn, side hairline, side volume, and nape line must be clearly visible.",
        "The nose should point toward viewer left.",
        "Do not render a three-quarter view, front portrait, rear view, or mirrored left profile.",
      ].join("\n");
    case "좌후면":
      return [
        "SLOT = LOWER_LEFT_REAR_THREE_QUARTER.",
        "Camera position: behind and slightly to the customer's own RIGHT side, looking at the back of the head.",
        "Show back-right crown, right rear head shape, right nape, neckline, and rear layer structure.",
        "The head is turned away from camera toward the customer's right; at most a small edge of right cheek or ear may appear.",
        "Do not render a front portrait, strict side profile, exact rear center, or the opposite left-rear view.",
      ].join("\n");
    case "후면":
      return [
        "SLOT = REAR_CENTER_EXACT_BACK.",
        "Camera position: exact rear/back view from behind at eye level.",
        "Show back silhouette, crown volume, back layers, nape, neckline, and upper shoulders.",
        "No face, eyes, nose, or mouth should be visible.",
        "Do not render a front portrait, side profile, or rear three-quarter view.",
      ].join("\n");
    case "우후면":
      return [
        "SLOT = LOWER_RIGHT_REAR_THREE_QUARTER.",
        "Camera position: behind and slightly to the customer's own LEFT side, looking at the back of the head.",
        "Show back-left crown, left rear head shape, left nape, neckline, and rear layer structure.",
        "The head is turned away from camera toward the customer's left; at most a small edge of left cheek or ear may appear.",
        "Do not render a front portrait, strict side profile, exact rear center, or the opposite right-rear view.",
      ].join("\n");
    default:
      return "Follow the requested grid slot exactly. Camera position is more important than showing the face.";
  }
}

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isFile(value: FormDataEntryValue): value is File {
  return value instanceof File;
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
    "Premium salon consultation portrait of the customer with the reference hairstyle translated naturally.",
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

function sanitizeReferenceRole(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[^\w-]/g, "").slice(0, 80);
}

function sanitizePhotoContext(value: FormDataEntryValue | null): AnglePhotoContext {
  if (typeof value !== "string" || !value.trim()) {
    return defaultPhotoContext();
  }

  try {
    const parsed = JSON.parse(value) as Partial<AnglePhotoContext>;
    const primaryReferenceSlot = sanitizePhotoSlot(parsed.primaryReferenceSlot);
    const secondaryReferenceSlot = sanitizePhotoSlot(parsed.secondaryReferenceSlot);
    const uploadedSlots = Array.isArray(parsed.uploadedSlots)
      ? uniquePhotoSlots(parsed.uploadedSlots)
      : [];

    return {
      hasActualFront: Boolean(parsed.hasActualFront),
      primaryReferenceSlot: primaryReferenceSlot ?? "front",
      secondaryReferenceSlot: secondaryReferenceSlot ?? "side",
      uploadedSlots,
    };
  } catch {
    return defaultPhotoContext();
  }
}

function defaultPhotoContext(): AnglePhotoContext {
  return {
    hasActualFront: true,
    primaryReferenceSlot: "front",
    secondaryReferenceSlot: "side",
    uploadedSlots: ["front", "side"],
  };
}

function sanitizePhotoSlot(value: unknown): AnglePhotoSlot | null {
  return value === "left" || value === "front" || value === "right" || value === "side"
    ? value
    : null;
}

function uniquePhotoSlots(values: unknown[]) {
  const slots: AnglePhotoSlot[] = [];

  values.forEach((value) => {
    const slot = sanitizePhotoSlot(value);

    if (slot && !slots.includes(slot)) {
      slots.push(slot);
    }
  });

  return slots;
}

function buildReferenceRoleInstruction(role: string, referenceCount: number) {
  if (!referenceCount) {
    return "";
  }

  const intro = `Staged consultation reference count: ${referenceCount}. Follow the staged generation dependency carefully.`;

  if (
    role.startsWith("canonical-front-anchor") ||
    role.startsWith("staged-neighbor-anchor")
  ) {
    return `${intro} The provided generated references are already-approved neighbouring consultation angles for this same customer and style (the exact front is always included). Treat them as the absolute authority for the haircut: reproduce the exact same hair length, fringe shape, layering, volume, parting, texture, and hair color on this angle. Keep the same facial identity from the original customer photos. Change ONLY the camera position to the requested stylist view — never redesign, shorten, or lengthen the hair, and never switch between long and short relative to these references.`;
  }

  if (
    role.startsWith("selected-preview-to-front") ||
    role.startsWith("selected-preview-style-to-canonical-front")
  ) {
    return `${intro} The selected recommendation image is not a trusted final angle slot. Treat it only as the chosen hairstyle and style-mood reference, not as the strongest identity or camera-angle source. Generate a new canonical exact front-facing center portrait from the original customer photos, using the original front photo as the face authority when available. Preserve the hairstyle design from the selected recommendation, but correct eyes, nose, mouth, jaw, cheek fullness, and facial proportions back to the original customer. Keep left-right orientation faithful to the original customer uploads.`;
  }

  if (role.startsWith("primary-left-front-right")) {
    return `${intro} This is the first base-angle stage. Generate one of the three primary stylist references: strict customer's left profile, exact front, or strict customer's right profile. Keep the hairstyle consistent with the selected recommendation and canonical front reference.`;
  }

  if (role.startsWith("top-from-primary-triple")) {
    return `${intro} The left/front/right base images are the authority for head shape and hairstyle. Generate only the overhead crown/top stylist reference from above, preserving the same cut structure and part direction.`;
  }

  if (role.startsWith("upper-corners-from-primary-top")) {
    return `${intro} Use the left/front/right base images plus the overhead top reference. Generate the requested high three-quarter upper-corner image looking toward the center of the grid, with crown and temple direction consistent.`;
  }

  if (role.startsWith("rear-from-primary-triple")) {
    return `${intro} Use the left/front/right base images as the authority for head width, nape, and side silhouette. Generate the exact rear/back stylist reference, with no face visible.`;
  }

  if (role.startsWith("rear-corners-from-primary-rear")) {
    return `${intro} Use the left/front/right base images plus the rear image. Generate the requested left-rear or right-rear three-quarter stylist reference, facing away from camera and keeping the rear silhouette consistent.`;
  }

  return intro;
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
