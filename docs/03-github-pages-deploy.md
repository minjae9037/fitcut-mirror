# GitHub Pages Deploy

Miri Look 웹 MVP는 정적 HTML/CSS/JS로 export해서 GitHub Pages에 올릴 수 있다.

참고:

- Next.js static export: https://nextjs.org/docs/app/guides/static-exports
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## 1. 로컬 정적 빌드

```bash
cd "D:\Codex\mirilook\apps\web"
npm run build
```

결과물:

```text
apps/web/out/
```

## 2. GitHub Pages용 경로

프로젝트 페이지 URL이 다음처럼 repository 이름을 포함하면:

```text
https://minjae9037.github.i./mirilook-mirror/
```

빌드할 때 다음 값을 설정한다.

```text
NEXT_PUBLIC_BASE_PATH./mirilook-mirror
```

이 값은 `next.config.ts`의 `basePath`와 이미지 경로에 함께 사용된다.

## 3. 배포 방식

현재 GitHub 인증 토큰에 workflow 권한이 없을 수 있으므로, 초기 프로토타입은 `gh-pages` 브랜치에 정적 결과물을 직접 push하는 방식으로 배포한다.

```text
main: 소스 코드
gh-pages: 정적 배포 결과물
```

GitHub Pages source는 `gh-pages` 브랜치의 root(`/`)로 설정한다.

나중에 GitHub 토큰에 `workflow` scope를 추가하면 GitHub Actions 자동 배포로 전환할 수 있다.

## 4. 주의

GitHub Pages는 정적 파일 호스팅이므로 서버 API가 필요한 기능은 바로 동작하지 않는다.

정적 MVP에서 가능한 것:

- 화면 프로토타입
- 정적 이미지 결과 미리보기
- 버튼/폼 UI
- 파일럿용 화면 리뷰

정식 웹서비스에서 별도 연결할 것:

- Supabase Auth
- Supabase Storage
- AI 이미지 생성 API
- 결제
- 공유 링크 만료/권한 제어
