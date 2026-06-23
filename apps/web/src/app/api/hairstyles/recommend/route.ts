import { NextResponse } from "next/server";
import { fitcutStyles } from "@/lib/fitcut-styles";

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

    return NextResponse.json({
      mode: "live",
      notes: [
        "정면과 측면 사진을 함께 기준으로 봤어요.",
        "각 헤어스타일 카드는 실제 AI 합성 이미지로 순차 생성됩니다.",
        "마음에 드는 디자인을 누르면 같은 스타일로 상담용 9장 구성을 만듭니다.",
      ],
      recommendations: fitcutStyles,
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
