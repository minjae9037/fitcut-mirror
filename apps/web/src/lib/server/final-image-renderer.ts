import { editHairImage, type ImageEditInput } from "./openai-image";
import { editHairImageWithGemini } from "./gemini-image";

type FinalImageProvider = "openai" | "gemini";
type FinalImageFallbackProvider = "none" | "openai";

export async function editFinalHairImage(input: ImageEditInput) {
  const provider = getFinalImageProvider();
  const fallbackProvider = getFinalImageFallbackProvider();

  if (provider === "gemini") {
    try {
      return await editHairImageWithGemini(input);
    } catch (error) {
      if (fallbackProvider !== "openai") {
        throw error;
      }

      console.warn(
        "Gemini final image generation failed. Falling back to OpenAI.",
        error,
      );

      try {
        return await editHairImage(input);
      } catch (fallbackError) {
        throw new Error(
          `Gemini final image generation failed, and OpenAI fallback also failed. Gemini: ${getErrorMessage(
            error,
          )} OpenAI: ${getErrorMessage(fallbackError)}`,
        );
      }
    }
  }

  return editHairImage(input);
}

export function getFinalImageProvider(): FinalImageProvider {
  const value = (
    process.env.MIRILOOK_FINAL_IMAGE_PROVIDER ??
    process.env.FITCUT_FINAL_IMAGE_PROVIDER ??
    process.env.FINAL_IMAGE_PROVIDER ??
    "openai"
  )
    .trim()
    .toLowerCase();

  if (
    value === "gemini" ||
    value === "google" ||
    value === "nano-banana" ||
    value === "nanobanana"
  ) {
    return "gemini";
  }

  return "openai";
}

export function getFinalImageFallbackProvider(): FinalImageFallbackProvider {
  const value = (
    process.env.MIRILOOK_FINAL_IMAGE_FALLBACK ??
    process.env.FITCUT_FINAL_IMAGE_FALLBACK ??
    process.env.FINAL_IMAGE_FALLBACK ??
    "none"
  )
    .trim()
    .toLowerCase();

  return value === "openai" ? "openai" : "none";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
