# Miri Look Web

미리룩의 웹 MVP 앱입니다.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- lucide-react

## Scripts

```bash
npm run dev
npm run build
npm run build:github
npm run lint
```

## Development

```bash
npm install
npm run dev
```

기본 개발 서버는 `http://localhost:3000`입니다.

## Current State

- Miri Look 브랜드 첫 화면
- 사진 업로드 UI
- 스타일 옵션 선택 UI
- mock AI 결과 미리보기
- 미용사 공유 화면 진입 버튼
- 파일럿 KPI 대시보드

실제 Supabase, AI provider, 결제 연결은 다음 단계에서 붙입니다.

## Static Export

`next.config.ts`는 GitHub Pages 배포를 위해 `output: "export"`로 설정되어 있습니다.

```bash
npm run build
```

정적 결과물은 `out/` 폴더에 생성됩니다.
