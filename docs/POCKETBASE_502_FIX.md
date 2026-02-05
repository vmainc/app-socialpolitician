# PocketBase 502 / service 203/EXEC fix

**app.socialpolitician.com only.** Production must use **`pocketbase/pb_migrations`** for migrations. The root **`pb_migrations/`** folder is for other projects (e.g. voices of the presidency) and must not be used on this app's VPS. Ensure the symlink: `pb_linux/pb_migrations` → `../pocketbase/pb_migrations` (run `scripts/vps-use-app-migrations-only.sh` on the VPS if unsure).

If the site shows **502 Bad Gateway** and the PocketBase service has **status=203/EXEC**, systemd is failing to run the ExecStart command (wrong path, binary not executable, or **wrong OS**: repo has a macOS binary but the VPS needs Linux).

## If 203/EXEC persists: use the Linux binary

The repo’s `pb_linux/pocketbase` is a **macOS (Mach-O)** binary. On the VPS you must use the **Linux amd64** build. One-time fix:

```bash
cd /var/www/socialpolitician-app/pb_linux
curl -L -o pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v0.36.2/pocketbase_0.36.2_linux_amd64.zip"
unzip -o pocketbase.zip
rm -f pocketbase.zip
chmod +x pocketbase
```

Then restart the service:

```bash
sudo systemctl restart socialpolitician-app-pocketbase.service
sudo systemctl status socialpolitician-app-pocketbase.service
curl -s http://127.0.0.1:8091/api/health
```

(Use a [newer release](https://github.com/pocketbase/pocketbase/releases) if you prefer; adjust the version in the URL and filename.)

## If you see "failed to apply migrations" or wrong data

Production uses **data** in `pocketbase/pb_data` and **migrations** from `pocketbase/pb_migrations`. The binary in `pb_linux` must see those. Do this on the VPS:

1. **Symlink migrations** so the binary can find them:
   ```bash
   cd /var/www/socialpolitician-app/pb_linux
   ln -sf ../pocketbase/pb_migrations pb_migrations
   ```

2. **Use the updated unit file** (from repo) so the service uses `pocketbase/pb_data`:
   ```bash
   cd /var/www/socialpolitician-app
   sudo cp etc/systemd/socialpolitician-app-pocketbase.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl restart socialpolitician-app-pocketbase.service
   ```

3. **Check logs** if it still fails:
   ```bash
   sudo journalctl -u socialpolitician-app-pocketbase.service -n 20 --no-pager
   ```

## Fix on the VPS (unit file / path)

1. **Install the correct unit file from the repo:**
   ```bash
   cd /var/www/socialpolitician-app
   sudo cp etc/systemd/socialpolitician-app-pocketbase.service /etc/systemd/system/
   sudo systemctl daemon-reload
   ```

2. **Make sure the binary is executable:**
   ```bash
   chmod +x /var/www/socialpolitician-app/pb_linux/pocketbase
   ```

3. **Start PocketBase:**
   ```bash
   sudo systemctl start socialpolitician-app-pocketbase.service
   sudo systemctl enable socialpolitician-app-pocketbase.service
   ```

4. **Check status:**
   ```bash
   sudo systemctl status socialpolitician-app-pocketbase.service
   curl -s http://127.0.0.1:8091/api/health
   ```

5. **Reload nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

The unit file uses `--dir=/var/www/socialpolitician-app/pocketbase` so PocketBase uses production data in `pocketbase/pb_data`. After a deploy, the deploy script copies this unit and runs `daemon-reload`.

---

## How the app connects to PocketBase (https://app.socialpolitician.com/pb/_/)

The frontend is configured to use the **relative** path `/pb`, so in production it talks to:

- **API:** `https://app.socialpolitician.com/pb/api/...` (e.g. `/pb/api/health`, `/pb/api/collections/...`)
- **Admin UI:** `https://app.socialpolitician.com/pb/_/`

That works only if:

1. **PocketBase is running** on the VPS and listening on `127.0.0.1:8091` (see steps above).
2. **Nginx** proxies `/pb/` to that backend.

On the VPS, ensure your Nginx config for `app.socialpolitician.com` includes a location for PocketBase. For example (path may be `sites-available/app.socialpolitician.com` or `app.socialpolitician.com.conf`):

```nginx
location /pb/ {
    proxy_pass http://127.0.0.1:8091/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Check from the server that the backend is up before testing the public URL:

```bash
curl -s http://127.0.0.1:8091/api/health
```

If that returns JSON, then `https://app.socialpolitician.com/pb/api/health` should work once Nginx is configured and reloaded.
