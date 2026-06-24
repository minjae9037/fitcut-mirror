import { NextResponse } from "next/server";
import { getHairColorById } from "@/lib/fitcut-colors";
import { getStyleById, resultAngles } from "@/lib/fitcut-styles";
import { editHairImage } from "@/lib/server/openai-image";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!hasFormContentType(request)) {
      return NextResponse.json(
        { error: "정면 사진과 측면 사진이 모두 필요합니다." },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const base = formData.get("base");
    const front = formData.get("front");
    const side = formData.get("side");
    const leftSide = formData.get("leftSide");
    const rightSide = formData.get("rightSide");
    const styleId = getString(formData.get("styleId"));
    const hairColorId = getString(formData.get("hairColorId"));
    const styleMemo = sanitizeStyleMemo(formData.get("styleMemo"));
    const angleIndex = Number(formData.get("angleIndex") ?? -1);
    const style = getStyleById(styleId);
    const hairColor =
      getHairColorById(hairColorId) ?? getHairColorById("natural-black");
    const angle = resultAngles[angleIndex];

    if (!(front instanceof File) || !(side instanceof File)) {
      return NextResponse.json(
        { error: "정면 사진과 측면 사진이 모두 필요합니다." },
        { status: 400 },
      );
    }

    if (!style || !hairColor || !angle) {
      return NextResponse.json(
        { error: "지원하지 않는 헤어스타일, 컬러 또는 각도입니다." },
        { status: 400 },
      );
    }

    const stylePrompt = buildStylePrompt(style.prompt, hairColor.prompt, styleMemo);

    const imageUrl = await editHairImage({
      base: base instanceof File ? base : undefined,
      front,
      leftSide: leftSide instanceof File ? leftSide : undefined,
      rightSide: rightSide instanceof File ? rightSide : undefined,
      side,
      source: angle.source,
      size: process.env.OPENAI_ANGLE_IMAGE_SIZE ?? "1024x1024",
      prompt: buildAnglePrompt(
        style.name,
        stylePrompt,
        angle.prompt,
        base instanceof File,
      ),
    });

    return NextResponse.json({
      mode: "live",
      label: angle.label,
      imageUrl,
    });
  } catch (error) {
    console.error(error);

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

function buildAnglePrompt(
  styleName: string,
  stylePrompt: string,
  anglePrompt: string,
  hasBaseReference: boolean,
) {
  return `
Create a photorealistic men's salon consultation reference image.

Use the uploaded photos as identity references.
${hasBaseReference ? "Use the first uploaded image as the selected hairstyle reference. It may be front-facing, left-facing, right-facing, high angle, or low angle. Match its face, hair design, actual clothing style from the uploaded photos, skin tone, and realistic indoor lighting as closely as possible, but do not copy its pose if the requested camera position is different. Never mirror, invert, or horizontally flip this selected reference." : ""}
Preserve the same person: facial identity, face shape, skin tone, actual clothing style from the uploaded photos, and overall realistic appearance.
Maintain the exact left-right orientation from the uploaded references. Do not horizontally flip the face, hair part, hair flow, facial asymmetry, jacket zipper, hand position, or background landmarks.
Facial consistency is more important than beautification. Do not make the face slimmer, wider, older, younger, heavier, thinner, sharper, softer, more handsome, or more doll-like.
Keep the same cheek fullness, jaw width, chin shape, nose size, eye spacing, eyelid shape, mouth shape, facial asymmetry, and natural expression tone from the uploaded identity references.
Replace the entire visible hairstyle with the requested style: hairline, fringe, crown, top volume, side line, texture, and silhouette.
The final image must visibly show the requested hairstyle and must not keep the original uploaded hairstyle.
Keep the image suitable for a hair stylist to understand the cut and styling direction.
Keep face and clothing tone consistent with the selected style reference, while changing camera angle and expression enough to avoid duplicate-looking images.

Hairstyle name:
${styleName}

Hairstyle details:
${stylePrompt}

View angle:
${anglePrompt}

The requested camera position is mandatory.
If the selected hairstyle reference is not front-facing and this request asks for the CENTER or a front-facing slot, rotate the same face and hairstyle into an exact front-facing portrait. Do not keep the selected reference's side gaze for a front-facing slot.
This request is for one image that will be placed into a larger app grid later. Do not draw the app grid.
Never mirror the same side for every result. If this request says the subject's LEFT cheek or LEFT jawline, that side must dominate. If this request says the subject's RIGHT cheek or RIGHT jawline, that side must dominate. If this request says FRONT, CENTER, TOP CENTER, or BOTTOM CENTER, both eyes and both cheeks must be balanced.
Single finished portrait only. Never create a 3x3 grid, collage, contact sheet, multi-panel layout, thumbnail board, before-after comparison, split screen, text, watermark, extra people, hats, or sunglasses.
`;
}

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeStyleMemo(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[<>]/g, "").trim().slice(0, 240);
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
