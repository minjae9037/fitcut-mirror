# Fitcut Mirror

AI 헤어 시뮬레이션을 통해 고객과 미용사가 같은 이미지를 보고 시술 방향을 합의하게 만드는 웹 우선 MVP 프로젝트입니다.

## Structure

```text
Fitcut Mirror/
  apps/
    web/
  docs/
```

## Documents

- [GitHub Pages Deploy](./docs/03-github-pages-deploy.md)

## Web App

```bash
npm run dev:web
npm run build:web
npm run lint:web
```

현재 개발 서버:

```text
http://localhost:3000
```

Vercel 서버 배포:

```text
https://fitcut-mirror.vercel.app
```

## Live AI Hair Generation

로컬 또는 서버 런타임에서는 OpenAI 이미지 편집 API로 실제 헤어 합성을 실행할 수 있습니다. `apps/web/.env.local`에 아래 값을 설정한 뒤 개발 서버를 실행합니다.

```bash
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_QUALITY=low
NEXT_PUBLIC_ENABLE_LIVE_AI=true
NEXT_PUBLIC_GENERATION_API_URL=
```

GitHub Pages는 정적 호스팅이라 API 키를 안전하게 보관할 서버가 없습니다. 공개 Pages에서는 같은 화면이 mock fallback으로 동작하고, 실제 공개 파일럿은 Vercel/Render/Cloudflare 같은 서버 배포에 위 환경 변수를 넣어 연결합니다.
