import { NextResponse } from "next/server";
import { getHairColorById } from "@/lib/fitcut-colors";
import { getStyleById } from "@/lib/fitcut-styles";
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
    const front = formData.get("front");
    const side = formData.get("side");
    const leftSide = formData.get("leftSide");
    const rightSide = formData.get("rightSide");
    const styleId = getString(formData.get("styleId"));
    const hairColorId = getString(formData.get("hairColorId"));
    const styleMemo = sanitizeStyleMemo(formData.get("styleMemo"));
    const previewIndex = Number(formData.get("previewIndex") ?? 0);
    const style = getStyleById(styleId);
    const hairColor =
      getHairColorById(hairColorId) ?? getHairColorById("natural-black");

    if (!(front instanceof File) || !(side instanceof File)) {
      return NextResponse.json(
        { error: "정면 사진과 측면 사진이 모두 필요합니다." },
        { status: 400 },
      );
    }

    if (!style || !hairColor) {
      return NextResponse.json(
        { error: "지원하지 않는 헤어스타일 또는 헤어 컬러입니다." },
        { status: 400 },
      );
    }

    const stylePrompt = buildStylePrompt(style.prompt, hairColor.prompt, styleMemo);

    const imageUrl = await editHairImage({
      front,
      leftSide: leftSide instanceof File ? leftSide : undefined,
      rightSide: rightSide instanceof File ? rightSide : undefined,
      side,
      source: "both",
      size: process.env.OPENAI_PREVIEW_IMAGE_SIZE ?? "1024x1024",
      prompt: buildPreviewPrompt(
        style.name,
        stylePrompt,
        style.previewPrompt,
        previewIndex,
      ),
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

function buildPreviewPrompt(
  styleName: string,
  stylePrompt: string,
  previewPrompt: string,
  previewIndex: number,
) {
  const anglePrompt = getPreviewAnglePrompt(previewIndex);

  return `
Create one realistic AI hairstyle try-on portrait for a men's salon consultation.

Use the uploaded front or primary photo as the main identity reference, and use the side reference photos for head shape, side silhouette, and face angle.
Keep the same man: face, skin tone, facial proportions, actual clothing style from the uploaded photos, and a realistic indoor salon consultation mood.
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
