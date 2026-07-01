# Miri Look

AI 헤어 시뮬레이션을 통해 고객과 미용사가 같은 이미지를 보고 시술 방향을 합의하게 만드는 MVP 프로젝트입니다.

## Structure

```text
mirilook/
  apps/
    web/
  docs/
```

## Web App

```bash
npm run dev:web
npm run build:web
npm run lint:web
```

로컬 개발 서버:

```text
http://localhost:3000
```

Vercel 배포:

```text
https://mirilook.com
```

## Live AI Hair Generation

Vercel 또는 로컬 서버 환경에서는 실제 헤어 추천과 이미지 합성을 실행할 수 있습니다.

현재 운영 방향은 D안입니다.

- 추천 분석과 9개 후보 이미지는 OpenAI/GPT 경로를 유지합니다.
- 고객이 선택한 1개 스타일의 최종 상담용 9장만 `MIRILOOK_FINAL_IMAGE_PROVIDER`로 렌더러를 선택합니다.
- `openai`는 기존 `gpt-image-2` 경로, `gemini`는 Nano Banana Pro 계열 `gemini-3-pro-image` 경로입니다.

```bash
OPENAI_API_KEY=sk-...
OPENAI_RECOMMENDATION_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_QUALITY=low
OPENAI_IMAGE_COMPRESSION=70
OPENAI_IMAGE_SIZE=1024x1024
OPENAI_PREVIEW_IMAGE_SIZE=1024x1024
OPENAI_ANGLE_IMAGE_SIZE=1024x1024
MIRILOOK_FINAL_IMAGE_PROVIDER=openai # openai | gemini
MIRILOOK_FINAL_IMAGE_FALLBACK=openai # none | openai
GEMINI_API_KEY=
GEMINI_IMAGE_MODEL=gemini-3-pro-image
GEMINI_IMAGE_ASPECT_RATIO=1:1
GEMINI_IMAGE_SIZE=1K
GOOGLE_CUSTOM_SEARCH_API_KEY=
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=
MIRILOOK_ADMIN_USER=mirilook
MIRILOOK_ADMIN_PASSWORD=
NEXT_PUBLIC_ENABLE_LIVE_AI=true
NEXT_PUBLIC_GENERATION_API_URL=
```

GitHub Pages는 정적 호스팅이라 서버 API를 직접 실행할 수 없습니다. 실제 AI 생성은 Vercel 같은 서버 배포 환경에서 사용합니다.
