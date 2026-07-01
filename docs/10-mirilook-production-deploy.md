# Miri Look Production Deploy

## Principle

대표님이 수정 요청을 하면 코드 수정 후 바로 production 검증과 배포까지 이어간다.

## Required Flow

1. Implement the requested change.
2. Run `npm.cmd run lint --workspace web`.
3. Run `npm.cmd run build --workspace web`.
4. Deploy from `apps/web` using `npx vercel deploy --prod --yes`.
5. Verify `https://mirilook.com/` and `https://www.mirilook.com/`.

## One Command

```powershell
npm.cmd run deploy:mirilook
```

This command checks the Vercel project link, lints, builds, deploys production,
and verifies both live domains.

## Notes

- Do not deploy from the repository root. Root deployment can miss the Next.js app dependencies.
- The customer-facing names are `미리룩` and `Miri Look`.
- Environment variable names may keep the `MIRILOOK_` prefix.
