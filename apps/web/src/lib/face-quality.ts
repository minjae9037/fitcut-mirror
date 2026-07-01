// Client-only photo suitability check using MediaPipe FaceDetector (BlazeFace
// short-range). Runs entirely in the browser — no token / server cost. Gives the
// customer instant feedback on whether an uploaded photo is good for hairstyle
// analysis: is a face present, and is it large/close enough to read clearly.
import type { FaceDetector as FaceDetectorType } from "@mediapipe/tasks-vision";

export type FaceQualityLevel = "good" | "fair" | "poor";

export type FaceQualityResult = {
  detail: string;
  faceRatio: number;
  label: string;
  level: FaceQualityLevel;
  score: number;
};

// MediaPipe wasm + model are loaded from CDN once and cached by the browser.
const MEDIAPIPE_VERSION = "0.10.35";
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

let detectorPromise: Promise<FaceDetectorType | null> | null = null;

async function getDetector(): Promise<FaceDetectorType | null> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset =
          await vision.FilesetResolver.forVisionTasks(WASM_BASE);

        return await vision.FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL },
          minDetectionConfidence: 0.4,
          runningMode: "IMAGE",
        });
      } catch (error) {
        console.warn("face detector init failed", error);

        return null;
      }
    })();
  }

  return detectorPromise;
}

export async function assessFaceQuality(
  file: File,
): Promise<FaceQualityResult | null> {
  const detector = await getDetector();

  if (!detector) {
    return null;
  }

  const bitmap = await loadBitmap(file);

  if (!bitmap) {
    return null;
  }

  try {
    const result = detector.detect(bitmap);
    const detections = result.detections ?? [];
    const imageArea = bitmap.width * bitmap.height;

    if (!detections.length || !imageArea) {
      return {
        detail: "정면이 잘 보이는 사진으로 교체를 추천합니다.",
        faceRatio: 0,
        label: "얼굴이 감지되지 않았어요",
        level: "poor",
        score: 0,
      };
    }

    // Use the largest detected face in the frame.
    let best = detections[0];
    let bestArea = boxArea(best);

    for (const detection of detections) {
      const area = boxArea(detection);

      if (area > bestArea) {
        best = detection;
        bestArea = area;
      }
    }

    const faceRatio = bestArea / imageArea;
    const score = best.categories?.[0]?.score ?? 0;

    return classify(faceRatio, score);
  } finally {
    if (typeof (bitmap as ImageBitmap).close === "function") {
      (bitmap as ImageBitmap).close();
    }
  }
}

function classify(faceRatio: number, score: number): FaceQualityResult {
  if (faceRatio < 0.035) {
    return {
      detail: "얼굴이 너무 작아요. 더 가까이서 찍은 사진을 추천합니다.",
      faceRatio,
      label: "얼굴이 작게 나왔어요",
      level: "poor",
      score,
    };
  }

  if (faceRatio < 0.09) {
    return {
      detail: "분석은 가능하지만, 조금 더 가까운 사진이면 더 정확해요.",
      faceRatio,
      label: "보통",
      level: "fair",
      score,
    };
  }

  return {
    detail: "얼굴이 또렷하게 잘 나왔어요.",
    faceRatio,
    label: "적합",
    level: "good",
    score,
  };
}

function boxArea(detection: {
  boundingBox?: { height?: number; width?: number };
}) {
  const box = detection.boundingBox;

  if (!box) {
    return 0;
  }

  return (box.width ?? 0) * (box.height ?? 0);
}

async function loadBitmap(
  file: File,
): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to an <img> element below.
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}
