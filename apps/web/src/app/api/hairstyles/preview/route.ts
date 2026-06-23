import { NextResponse } from "next/server";
import { getStyleById } from "@/lib/fitcut-styles";
import { editHairImage } from "@/lib/server/openai-image";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const front = formData.get("front");
    const side = formData.get("side");
    const styleId = String(formData.get("styleId") ?? "");
    const style = getStyleById(styleId);

    if (!(front instanceof File) || !(side instanceof File)) {
      return NextResponse.json(
        { error: "정면 사진과 측면 사진이 모두 필요합니다." },
        { status: 400 },
      );
    }

    if (!style) {
      return NextResponse.json(
        { error: "지원하지 않는 헤어스타일입니다." },
        { status: 400 },
      );
    }

    const imageUrl = await editHairImage({
      front,
      side,
      source: "both",
      size: process.env.OPENAI_PREVIEW_IMAGE_SIZE ?? "1024x1024",
      prompt: buildPreviewPrompt(style.prompt),
    });

    return NextResponse.json({
      mode: "live",
      style: {
        id: style.id,
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

function buildPreviewPrompt(stylePrompt: string) {
  return `
Create one realistic AI hairstyle try-on portrait for a men's salon consultation.

Use the uploaded front photo as the main identity reference and the side photo as the head-shape reference.
Keep the same man: face, skin tone, facial proportions, expression, clothing, camera angle, lighting, and background.
Edit the hair only.
Replace the visible hairstyle with the requested haircut. Change the hairline, fringe, crown, top volume, side line, texture, and overall silhouette.
The requested haircut must be clearly visible. Do not keep the original uploaded hairstyle.

Requested haircut:
${stylePrompt}

Return a single finished photorealistic portrait. No before-after comparison, no split screen, no text, no watermark, no extra people, no hats, no accessories.
`;
}
