# Add-to-Favorites Feature — What We Did and Where It Went Sideways

## What We Added (the feature)

1. **Backend (PocketBase)**
   - **Migration:** `pocketbase/pb_migrations/1770300000_create_user_favorites.js`
   - Creates `user_favorites` collection: `user` (relation → users), `politician` (relation → politicians), unique on `(user, politician)`.
   - Rules: list/view/create/delete only for the authenticated user (own records).

2. **Frontend**
   - **PoliticianProfile.tsx:** "Add to Favorites" / "In your favorites — Remove" button; calls `user_favorites` create/delete and checks existing favorite on load.
   - **Account.tsx:** "Your favorites" section listing the user's favorites (with `expand: 'politician'`), plus Sign Out moved to bottom.

All of that is in the repo and correct.

---

## Where Things Went Sideways

### 1. Migrations on the VPS

- The **app** uses **`pocketbase/pb_migrations/`** (under `pocketbase/`).
- The repo also has a **root `pb_migrations/`** with different migrations (e.g. from another project: presidents, personas, feeds, etc.).
- On the VPS, PocketBase was at some point using or seeing migrations from the **wrong** place (root `pb_migrations/` or a mix). That led to:
  - Crashes on startup
  - Or migrations for collections that don’t belong to this app

**Fix we used:**  
`scripts/vps-use-app-migrations-only.sh` — removes other-app migration files and ensures **only** `pocketbase/pb_migrations` is used (e.g. via symlink `pb_linux/pb_migrations` → `pocketbase/pb_migrations`). Service runs with `--dir=/var/www/socialpolitician-app/pocketbase` so data and migrations both come from the `pocketbase/` folder.

### 2. Admin Lockout

- While fixing deployment we tried to reset the PocketBase admin password.
- **What went wrong:**
  - Updating the DB with `sqlite3` and a bcrypt hash: the shell mangled the `$` in the hash.
  - Using the CLI with `--dir=/var/www/socialpolitician-app/pocketbase` pointed at the wrong place; the CLI expected `--dir=.../pocketbase/pb_data` to see the same DB.
  - PocketBase requires **password length ≥ 8** and **tokenKey cannot be blank**. We had set a 6-char password and cleared `tokenKey`, so validation failed.
  - The script that sets the new password lived only on your Mac; the VPS had an old version (6-char password) until we committed/pushed the fix and you pulled again.

**Fix:**  
`scripts/vps-reset-admin-password.py` — run with PocketBase stopped; sets an 8-char password and a **non-blank** `tokenKey` (random hex). Use that script from the repo after `git pull`, or run the one-liner from `scripts/README-VPS-PASSWORD-RESET.md`.

---

## Database path: why "create your first superuser" kept appearing

The service uses `--dir=/var/www/socialpolitician-app/pocketbase`. With PocketBase, **that path is the data directory**, so the DB file is **`pocketbase/data.db`** (not `pocketbase/pb_data/data.db`). We had been updating `pocketbase/pb_data/data.db` in the script and with the CLI when using `--dir=.../pocketbase/pb_data`, so the **running server never saw those changes** and kept prompting to create the first superuser. The script is now updated to use `pocketbase/data.db` so it touches the same DB the server uses.

If the superuser row doesn't exist in that DB yet, use the CLI once (service stopped):

```bash
sudo systemctl stop socialpolitician-app-pocketbase
cd /var/www/socialpolitician-app/pb_linux
./pocketbase superuser upsert admin@vma.agency 12345678 --dir=/var/www/socialpolitician-app/pocketbase
sudo systemctl start socialpolitician-app-pocketbase
```

`upsert` creates or updates the superuser in the DB the server uses (`pocketbase/data.db`). Then log in at https://app.socialpolitician.com/pb/_/ with **admin@vma.agency** / **12345678**.

## Current State

- **Admin:** After fixing the DB path (script and/or `superuser upsert --dir=.../pocketbase`), you can log in at `https://app.socialpolitician.com/pb/_/`.
- **Service:** PocketBase runs with `--dir=.../pocketbase`, so it uses `pocketbase/pb_data` and `pocketbase/pb_migrations`.
- **Favorites in code:** Migration and frontend are in place; behavior is correct for a clean run.

## What to Confirm on the VPS (favorites in production)

1. **Migration applied**  
   After the last deploy, PocketBase should have run `1770300000_create_user_favorites.js`. You can confirm in the admin UI: Collections → `user_favorites` exists.

2. **If `user_favorites` is missing**  
   Run migrations again (or restart PocketBase so it runs pending migrations). If the collection still doesn’t appear, check:
   - Only `pocketbase/pb_migrations` is in use (no stray root migrations).
   - No migration errors in PocketBase logs:  
     `sudo journalctl -u socialpolitician-app-pocketbase.service -n 50`

3. **Politicians collection ID**  
   The favorites migration hardcodes `politiciansId = "pbc_3830222512"`. That matches the politicians collection created by this app’s migrations. If the VPS DB was ever created with a different set of migrations, the politicians collection could have another ID; in that case the migration would need that ID updated (or we use `findCollectionByNameOrId("politicians")` in the migration).

---

## Summary

- **Feature:** Favorites (backend + frontend) is implemented and in the repo.
- **Sideways:** (1) Wrong migrations on VPS → fixed with app-only migrations and correct `--dir`; (2) Admin lockout → fixed with 8-char password, non-blank tokenKey, and the reset script.
- **Next:** Confirm `user_favorites` exists in production and that the app (PoliticianProfile + Account) can create/list/delete favorites when logged in.
