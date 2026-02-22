# Deploy checklist (push to git and go live)

## Before you push

- [ ] No secrets in committed files (passwords, API keys). Use `.env` or env vars on the server; see `.env.example`.
- [ ] `npm run build` passes (from repo root: builds `web/`).
- [ ] Local app works: `npm run dev` and test Executive, profiles, favorites.

## Push to git

```bash
git status   # review
git commit -m "Executive branch, profile bios, social from Google, reps data, cleanup presidents"
git push origin main
```

## After push (go live)

1. **Server:** Pull on the VPS and rebuild:
   ```bash
   cd /path/to/app.socialpolitician.com
   git pull origin main
   npm ci
   npm run build
   ```

2. **PocketBase:** Restart so new migrations run (if any). Ensure `politicians` collection allows `office_type` president / vice_president / cabinet and has the fields used by the app (see `pocketbase/README-SCHEMA.md`).

3. **Data on live:** If this is the first time deploying Executive/Reps:
   - Import from JSON (executive + representatives data): run `npm run pb:import` **against live** PocketBase (set `POCKETBASE_URL` to your live PB URL and env auth).
   - Or sync from an existing source; see `docs/EXECUTIVE.md` and the main README.

4. **Env on server:** Ensure production has `VITE_POCKETBASE_URL` (or equivalent) pointing at your live PocketBase API URL. No need for `SERPAPI_API_KEY` or admin password in production unless you run enrich/backfill scripts on the server.

5. **Restart app:** Restart your Node/PM2/server so it serves the new `web/dist/`.

## Optional (not required for app to run)

- **Social links:** Run `pb:backfill-executive-social` and/or `pb:enrich:social:google:executive` against live PB to fill social profiles (see `docs/EXECUTIVE.md`).
- **Portraits:** Upload or sync photos to live PocketBase if needed; see `docs/MISSING_IMAGES_AFTER_IMPORT.md`.
