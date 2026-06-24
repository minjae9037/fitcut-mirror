import { NextResponse } from "next/server";
import { fitcutStyles } from "@/lib/fitcut-styles";
import { recommendHairStyles } from "@/lib/server/openai-recommendations";

export const runtime = "nodejs";
export const maxDuration = 60;

const fallbackNotes = [
  "내 사진을 바탕으로 어울리는 헤어스타일을 정교하게 추천합니다.",
  "Choose a look, preview it on your face, and bring a clearer reference to your stylist.",
  "마음에 드는 디자인을 누르면 크게 확인하고, 버튼을 눌러 상담용 9장을 생성할 수 있습니다.",
];

export async function POST(request: Request) {
  try {
    if (!hasFormContentType(request)) {
      return NextResponse.json(
        { error: "좌측면, 정면, 우측면 중 최소 2장이 필요합니다." },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const front = formData.get("front");
    const side = formData.get("side");
    const leftSide = formData.get("leftSide");
    const rightSide = formData.get("rightSide");
    const styleMemo = sanitizeStyleMemo(formData.get("styleMemo"));

    if (!(front instanceof File) || !(side instanceof File)) {
      return NextResponse.json(
        { error: "좌측면, 정면, 우측면 중 최소 2장이 필요합니다." },
        { status: 400 },
      );
    }

    try {
      const recommendation = await recommendHairStyles({
        front,
        leftSide: leftSide instanceof File ? leftSide : undefined,
        rightSide: rightSide instanceof File ? rightSide : undefined,
        side,
        styleMemo,
      });

      return NextResponse.json({
        mode: "live",
        ...recommendation,
      });
    } catch (error) {
      console.error("OpenAI recommendation failed", error);

      return NextResponse.json({
        mode: "fallback",
        notes: fallbackNotes,
        recommendations: fitcutStyles,
        warning:
          error instanceof Error
            ? error.message
            : "헤어스타일 추천 분석에 실패했습니다.",
      });
    }
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

function hasFormContentType(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  return (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  );
}

function sanitizeStyleMemo(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[<>]/g, "").trim().slice(0, 240);
}
