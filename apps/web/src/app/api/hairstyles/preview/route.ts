import { NextResponse } from "next/server";
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
    const styleId = getString(formData.get("styleId"));
    const fallbackStyle = getStyleById(styleId);
    const styleName =
      getString(formData.get("styleName")) ||
      fallbackStyle?.name ||
      "추천 스타일";
    const stylePrompt =
      getString(formData.get("stylePrompt")) || fallbackStyle?.prompt;
    const previewPrompt =
      getString(formData.get("previewPrompt")) ||
      fallbackStyle?.previewPrompt ||
      "Create a fresh front three-quarter premium salon portrait with a natural expression and clear hairstyle visibility.";

    if (!(front instanceof File) || !(side instanceof File)) {
      return NextResponse.json(
        { error: "정면 사진과 측면 사진이 모두 필요합니다." },
        { status: 400 },
      );
    }

    if (!stylePrompt) {
      return NextResponse.json(
        { error: "헤어스타일 프롬프트가 필요합니다." },
        { status: 400 },
      );
    }

    const imageUrl = await editHairImage({
      front,
      side,
      source: "both",
      size: process.env.OPENAI_PREVIEW_IMAGE_SIZE ?? "1024x1024",
      prompt: buildPreviewPrompt(styleName, stylePrompt, previewPrompt),
    });

    return NextResponse.json({
      mode: "live",
      style: {
        id: styleId,
        name: styleName,
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
) {
  return `
Create one realistic AI hairstyle try-on portrait for a men's salon consultation.

Use the uploaded front photo as the main identity reference and the side photo as the head-shape reference.
Keep the same man: face, skin tone, facial proportions, clothing style, black leather jacket, black turtleneck, and premium indoor cafe/salon mood.
Edit the hair only.
Replace the visible hairstyle with the requested haircut. Change the hairline, fringe, crown, top volume, side line, texture, and overall silhouette.
The requested haircut must be clearly visible. Do not keep the original uploaded hairstyle.
Create a new portrait variation rather than copying the uploaded selfie composition exactly.

Requested haircut name:
${styleName}

Requested haircut details:
${stylePrompt}

Composition and expression:
${previewPrompt}

Return a single finished photorealistic portrait. No before-after comparison, no split screen, no text, no watermark, no extra people, no hats, no accessories.
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
