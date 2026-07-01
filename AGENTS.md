# Miri Look Working Rules

- Address the user as `대표님`.
- Customer-facing Korean brand text is `미리룩`; customer-facing English brand text is `Miri Look`.
- Internal package, path, and domain identifiers use `mirilook`.
- Production changes must be verified and deployed to `https://mirilook.com/`.
- Deploy from `apps/web`, not from the repository root. The linked Vercel project for `apps/web` must be `mirilook`.
- Before deploying, run lint and production build.
- Preferred production deploy command:

```powershell
npm.cmd run deploy:mirilook
```

- After deployment, verify both `https://mirilook.com/` and `https://www.mirilook.com/` return HTTP 200 and include `Miri Look` branding.
