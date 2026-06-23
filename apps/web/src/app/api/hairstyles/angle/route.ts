import { NextResponse } from "next/server";
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
    const styleId = getString(formData.get("styleId"));
    const angleIndex = Number(formData.get("angleIndex") ?? -1);
    const fallbackStyle = getStyleById(styleId);
    const styleName =
      getString(formData.get("styleName")) ||
      fallbackStyle?.name ||
      "추천 스타일";
    const stylePrompt =
      getString(formData.get("stylePrompt")) || fallbackStyle?.prompt;
    const angle = resultAngles[angleIndex];

    if (!(front instanceof File) || !(side instanceof File)) {
      return NextResponse.json(
        { error: "정면 사진과 측면 사진이 모두 필요합니다." },
        { status: 400 },
      );
    }

    if (!stylePrompt || !angle) {
      return NextResponse.json(
        { error: "지원하지 않는 헤어스타일 또는 각도입니다." },
        { status: 400 },
      );
    }

    const imageUrl = await editHairImage({
      base: base instanceof File ? base : undefined,
      front,
      side,
      source: angle.source,
      size: process.env.OPENAI_ANGLE_IMAGE_SIZE ?? "1024x1024",
      prompt: buildAnglePrompt(
        styleName,
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
${hasBaseReference ? "Use the first uploaded image as the canonical front hairstyle reference. Match its face, hair design, black leather jacket, black turtleneck, skin tone, and premium indoor lighting as closely as possible." : ""}
Preserve the same person: facial identity, face shape, skin tone, clothing style, and overall realistic appearance.
Replace the entire visible hairstyle with the requested style: hairline, fringe, crown, top volume, side line, texture, and silhouette.
The final image must visibly show the requested hairstyle and must not keep the original uploaded hairstyle.
Keep the image suitable for a hair stylist to understand the cut and styling direction.
Keep face and clothing tone consistent with the canonical front result, while changing camera angle and expression enough to avoid duplicate-looking images.

Hairstyle name:
${styleName}

Hairstyle details:
${stylePrompt}

View angle:
${anglePrompt}

The requested camera position is mandatory. Do not substitute a front-facing portrait when a side, top, low-angle, or rear view is requested.
Single finished portrait only. No before-after comparison, no split screen, no text, no watermark, no extra people, no hats, no sunglasses.
`;
}

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function hasFormContentType(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  return (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  );
}
