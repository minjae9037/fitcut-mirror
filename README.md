# Fitcut Mirror

AI 헤어 시뮬레이션을 통해 고객과 미용사가 같은 이미지를 보고 시술 방향을 합의하게 만드는 MVP 프로젝트입니다.

## Structure

```text
Fitcut Mirror/
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
https://fitcut-mirror.vercel.app
```

## Live AI Hair Generation

Vercel 또는 로컬 서버 환경에서는 OpenAI API로 실제 헤어 추천과 이미지 합성을 실행할 수 있습니다.

```bash
OPENAI_API_KEY=sk-...
OPENAI_RECOMMENDATION_MODEL=gpt-4.1-mini
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_QUALITY=low
OPENAI_IMAGE_COMPRESSION=70
OPENAI_IMAGE_SIZE=1024x1024
OPENAI_PREVIEW_IMAGE_SIZE=1024x1024
OPENAI_ANGLE_IMAGE_SIZE=1024x1024
NEXT_PUBLIC_ENABLE_LIVE_AI=true
NEXT_PUBLIC_GENERATION_API_URL=
```

GitHub Pages는 정적 호스팅이라 서버 API를 직접 실행할 수 없습니다. 실제 AI 생성은 Vercel 같은 서버 배포 환경에서 사용합니다.
