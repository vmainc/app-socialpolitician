# Terminal Commands by Machine

Use this as a reference: **which machine** runs **which commands**.

---

## LOCAL MACHINE (your Mac / desktop)

Your repo lives here (e.g. `~/Desktop/DOUGS PLUGINS/app.socialpolitician.com`). Use these on your **local** terminal.

### Development

```bash
cd "/Users/doughigson/Desktop/DOUGS PLUGINS/app.socialpolitician.com"

npm install
npm run dev
```

- Opens app at `http://localhost:5173` (or similar). PocketBase must be running locally if you hit API.

### Save and push code (so VPS can pull it)

```bash
cd "/Users/doughigson/Desktop/DOUGS PLUGINS/app.socialpolitician.com"

# 1. See what changed
git status

# 2. Stage the files you want to commit
git add path/to/file1 path/to/file2
# or stage everything:
git add -A

# 3. Commit
git commit -m "Short description of the change"

# 4. Push to GitHub (so the VPS can pull)
git push origin main
```

- **Push** always runs on your **local** machine. After this, the VPS gets updates via `git pull`.

### One-off data/script work (optional on local)

If PocketBase is running locally and you want to run scripts on your machine:

```bash
cd "/Users/doughigson/Desktop/DOUGS PLUGINS/app.socialpolitician.com"

export POCKETBASE_URL=http://127.0.0.1:8091
export POCKETBASE_ADMIN_EMAIL=admin@vma.agency
export POCKETBASE_ADMIN_PASSWORD='YOUR_ADMIN_PASSWORD'

# Examples (same commands as on VPS, different POCKETBASE_URL):
npx tsx server/src/scripts/importPoliticiansFromJSON.ts
npx tsx server/src/scripts/backfillBiosFromWikipedia.ts --office-type=governor
node scripts/scrape_portraits.js
node scripts/upload_portraits.js
```

- Normally you run these on the **VPS** (see below); use locally only if you’re testing against local PocketBase.

---

## VPS (server: app.socialpolitician.com)

SSH into the server, then `cd /var/www/socialpolitician-app`. All commands in this section are run **on the VPS** in that directory.

### Deploy (get latest code and rebuild)

Run after you’ve pushed from your local machine:

```bash
cd /var/www/socialpolitician-app
git pull origin main
bash deploy-to-vps.sh
```

- Pulls latest code, installs deps, builds frontend, restarts services. This is the main “ship it” step on the server.
- **After deploy:** do a **hard refresh** in the browser (Ctrl+Shift+R or Cmd+Shift+R) so you don’t see an old cached JS bundle. If you still see old UI (e.g. no accordions), hard refresh or try an incognito window.

### Environment (set once per session or in your profile)

```bash
export POCKETBASE_URL=http://127.0.0.1:8091
export POCKETBASE_ADMIN_EMAIL=admin@vma.agency
export POCKETBASE_ADMIN_PASSWORD='YOUR_ACTUAL_PASSWORD'
```

- Use these before any of the PocketBase scripts below (or put them in a small script you source).

### Import politicians from JSON

```bash
cd /var/www/socialpolitician-app

POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD='YOUR_PASSWORD' \
npx tsx server/src/scripts/importPoliticiansFromJSON.ts
```

- **Machine: VPS.** Reads `data/*.json` and upserts into PocketBase.

### Backfill governor (or senator/representative) bios from Wikipedia

```bash
cd /var/www/socialpolitician-app

POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD='YOUR_PASSWORD' \
npx tsx server/src/scripts/backfillBiosFromWikipedia.ts --office-type=governor
```

- **Machine: VPS.** Fills `headline` and `bio` for politicians that have `wikipedia_url` and empty bio. Use `--office-type=senator` or `--office-type=representative` to limit.

### One-time: copy existing bio → headline

```bash
cd /var/www/socialpolitician-app

POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD='YOUR_PASSWORD' \
npx tsx server/src/scripts/copyBioToHeadline.ts
```

- **Machine: VPS.** Run once after adding the `headline` field if you want existing `bio` text in the hero.

### Delete all politicians (then re-import)

```bash
cd /var/www/socialpolitician-app

POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD='YOUR_PASSWORD' \
npx tsx server/src/scripts/deleteAllPoliticians.ts
```

- **Machine: VPS.** Use only when you want a clean slate before re-importing from JSON.

### Portraits: scrape from Wikipedia → to-label

```bash
cd /var/www/socialpolitician-app

POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD='YOUR_PASSWORD' \
node scripts/scrape_portraits.js
```

- **Machine: VPS.** Downloads images for politicians without a photo into `portraits/to-label/`. Follow redirects and disambiguation (e.g. Spencer Cox).

### Portraits: attach by slug from portraits/uploaded/

```bash
cd /var/www/socialpolitician-app

POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD='YOUR_PASSWORD' \
node scripts/upload_portraits_by_slug.js
```

- **Machine: VPS.** Matches files in `portraits/uploaded/` to politician by slug (e.g. after re-import when IDs changed). Use `--force` to overwrite existing photos.

### Portraits: upload from to-label to PocketBase

```bash
cd /var/www/socialpolitician-app

POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD='YOUR_PASSWORD' \
node scripts/upload_portraits.js
```

- **Machine: VPS.** Takes files in `portraits/to-label/` (and optionally `portraits/labeled/`) and attaches them to the correct politician record in PocketBase.

### Remove media sources from data (one-time)

```bash
cd /var/www/socialpolitician-app
node scripts/removeMediaFromPoliticiansData.mjs
```

- **Machine: local or VPS.** Edits `data/politicians_import_ready.json` to remove media/platform entries. Run once; then commit and push from local if you want the change in git.

---

## Quick reference: machine per task

| Task | Machine |
|------|--------|
| Edit code, run dev server | **Local** |
| `git add` / `git commit` / `git push` | **Local** |
| `git pull` + `deploy-to-vps.sh` | **VPS** |
| Import politicians, backfill bios, delete politicians | **VPS** |
| Scrape portraits, upload portraits, upload by slug | **VPS** |
| Remove media from JSON (one-time) | **Local** or **VPS** (then push from local if needed) |

---

## Typical workflow

1. **Local:** Edit code → `git add` → `git commit` → `git push origin main`
2. **VPS:** `cd /var/www/socialpolitician-app` → `git pull origin main` → `bash deploy-to-vps.sh`
3. **VPS (data/portraits):** Run any of the PocketBase/portrait commands above with env vars set.
