import { NextResponse } from "next/server";
import { fitcutStyles } from "@/lib/fitcut-styles";
import { editHairImage } from "@/lib/server/openai-image";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const front = formData.get("front");
    const side = formData.get("side");

    if (!(front instanceof File) || !(side instanceof File)) {
      return NextResponse.json(
        { error: "정면 사진과 측면 사진이 모두 필요합니다." },
        { status: 400 },
      );
    }

    const stylesToRender = fitcutStyles.slice(0, 6);
    const recommendations = [];

    for (const style of stylesToRender) {
      const imageUrl = await editHairImage({
        front,
        side,
        source: "both",
        prompt: buildRecommendationPrompt(style.prompt),
      });

      recommendations.push({
        id: style.id,
        name: style.name,
        reason: style.reason,
        tags: style.tags,
        accent: style.accent,
        cropClass: style.cropClass,
        imageUrl,
      });
    }

    return NextResponse.json({
      mode: "live",
      notes: [
        "정면과 측면 사진을 함께 기준으로 실제 헤어 합성 이미지를 만들었어요.",
        "얼굴, 피부톤, 의상, 배경은 최대한 유지하고 헤어만 바꾸도록 요청했습니다.",
        "마음에 드는 디자인을 누르면 같은 스타일로 9개 각도 상담 이미지를 생성합니다.",
      ],
      recommendations,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "헤어스타일 추천 생성에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}

function buildRecommendationPrompt(stylePrompt: string) {
  return `
You are creating a realistic hairstyle try-on preview for a men's salon consultation.

Use the uploaded front and side photos as identity and head-shape references.
Create a NEW photorealistic image of the same man with the requested haircut applied.
Preserve the person's facial identity, skin tone, expression, face shape, clothing, lighting, camera feel, and background.
Replace the entire visible hairstyle: hairline, fringe, crown, top volume, side line, texture, and silhouette.
The final image must visibly show the requested hairstyle and must not keep the original uploaded hairstyle.

Hairstyle request:
${stylePrompt}

Output a clean photorealistic front-facing consultation preview.
Single finished portrait only. No before-after comparison, no split screen, no text, no watermark, no extra people, no accessories added.
`;
}
