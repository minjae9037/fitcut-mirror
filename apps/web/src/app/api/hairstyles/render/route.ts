import { NextResponse } from "next/server";
import { getStyleById, resultAngles } from "@/lib/fitcut-styles";
import { editHairImage } from "@/lib/server/openai-image";

export const runtime = "nodejs";

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

    const results = [];

    for (const angle of resultAngles) {
      const imageUrl = await editHairImage({
        front,
        side,
        source: angle.source,
        prompt: buildAnglePrompt(style.prompt, angle.prompt),
      });

      results.push({
        label: angle.label,
        imageUrl,
      });
    }

    return NextResponse.json({
      mode: "live",
      style: {
        id: style.id,
        name: style.name,
      },
      results,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "9개 각도 이미지 생성에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}

function buildAnglePrompt(stylePrompt: string, anglePrompt: string) {
  return `
Create a photorealistic men's salon consultation reference image.

Use the uploaded photo as the identity reference.
Preserve the same person: facial identity, face shape, skin tone, expression, and overall realistic appearance.
Change only the hairstyle.
Keep the image suitable for a hair stylist to understand the cut and styling direction.

Hairstyle:
${stylePrompt}

View angle:
${anglePrompt}

No text, no watermark, no extra people, no hats, no sunglasses.
`;
}
