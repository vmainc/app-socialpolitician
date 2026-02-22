# Reset PocketBase admin password on VPS

If you're locked out of the PocketBase admin UI, run the reset **on the VPS** (not on your Mac).

## Option 1: Run script from repo (after pulling)

**On your Mac** (in the app project folder):

```bash
cd ~/Desktop/DOUGS\ PLUGINS/app.socialpolitician.com
git add scripts/vps-reset-admin-password.py scripts/README-VPS-PASSWORD-RESET.md
git commit -m "Add VPS admin password reset script"
git push origin main
```

**On the VPS** (SSH in first, e.g. `ssh doug@your-vps-ip`):

```bash
cd /var/www/socialpolitician-app
git pull origin main

# Stop PocketBase so the DB can be updated safely
sudo systemctl stop socialpolitician-app-pocketbase.service

# Reset password (sets admin@vma.agency to 12345678)
python3 scripts/vps-reset-admin-password.py

# Start PocketBase again
sudo systemctl start socialpolitician-app-pocketbase.service
```

Then open https://app.socialpolitician.com/pb/_/ in a private/incognito window and log in with **admin@vma.agency** / **12345678**. Change the password in the admin UI after logging in.

---

## Option 2: Create and run script on VPS without git

If the script isn't on the server yet, paste this **entire block** in your VPS SSH session (path is `/var/www/socialpolitician-app`):

```bash
cd /var/www/socialpolitician-app && mkdir -p scripts && cat > scripts/vps-reset-admin-password.py << 'ENDPY'
#!/usr/bin/env python3
import sqlite3, sys
DB = "/var/www/socialpolitician-app/pocketbase/pb_data/data.db"
EMAIL, NEW_PASSWORD = "admin@vma.agency", "123456"
try: import bcrypt
except ImportError: print("Run: sudo apt install -y python3-bcrypt"); sys.exit(1)
def main():
    h = bcrypt.hashpw(NEW_PASSWORD.encode(), bcrypt.gensalt(rounds=10)).decode()
    c = sqlite3.connect(DB)
    cur = c.cursor()
    cur.execute("UPDATE _superusers SET password = ?, tokenKey = '' WHERE email = ?", (h, EMAIL))
    if cur.rowcount == 0: print("No row. Check: sqlite3", DB, '"SELECT id, email FROM _superusers;"'); c.close(); sys.exit(1)
    c.commit(); c.close()
    print("Done. Log in at https://app.socialpolitician.com/pb/_/ with", EMAIL, "/", NEW_PASSWORD)
if __name__ == "__main__": main()
ENDPY
python3 scripts/vps-reset-admin-password.py
```

Then log in at https://app.socialpolitician.com/pb/_/ with **admin@vma.agency** / **12345678** (use incognito or clear cookies for the site).

**Important:** The service runs with `--dir=.../pocketbase/pb_data`, so the DB file is `pocketbase/pb_data/data.db`. The script updates that file; stop the service before running so the update is applied cleanly.
