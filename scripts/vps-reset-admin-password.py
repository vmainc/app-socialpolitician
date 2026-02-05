#!/usr/bin/env python3
"""
Reset PocketBase superuser password on VPS.
Run: cd /var/www/socialpolitician-app && python3 scripts/vps-reset-admin-password.py
Uses bcrypt; if missing: pip install bcrypt (or: apt install python3-bcrypt)
Password must be 8+ chars (PocketBase requirement).
"""
import os
import secrets
import sqlite3
import sys

# App DB with data: --dir=.../pocketbase/pb_data (577 politicians, etc.). Override with PB_DB_PATH env.
DB = os.environ.get("PB_DB_PATH", "/var/www/socialpolitician-app/pocketbase/pb_data/data.db")
EMAIL = "admin@vma.agency"
NEW_PASSWORD = "12345678"  # 8+ chars required by PocketBase

try:
    import bcrypt
except ImportError:
    print("Install bcrypt: pip install bcrypt  or  apt install python3-bcrypt")
    sys.exit(1)

def main():
    password_hash = bcrypt.hashpw(NEW_PASSWORD.encode(), bcrypt.gensalt(rounds=10)).decode()
    token_key = secrets.token_hex(16)  # new key so old sessions invalid; cannot be blank
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute("UPDATE _superusers SET password = ?, tokenKey = ? WHERE email = ?", (password_hash, token_key, EMAIL))
    if cur.rowcount == 0:
        print("No row updated - is email correct? Check: SELECT id, email FROM _superusers;")
        conn.close()
        sys.exit(1)
    conn.commit()
    # Verify: re-read and show that password and tokenKey look correct
    cur.execute("SELECT password, tokenKey FROM _superusers WHERE email = ?", (EMAIL,))
    row = cur.fetchone()
    conn.close()
    if row:
        pwd_preview = (row[0] or "")[:20] + "..." if (row[0] and len(row[0]) > 20) else row[0]
        tk_ok = bool(row[1] and len(row[1]) > 0)
        print("Password updated. Log in at https://app.socialpolitician.com/pb/_/")
        print("  Email:", EMAIL)
        print("  Password:", NEW_PASSWORD)
        print("  DB check: password hash set:", "yes" if (row[0] and row[0].startswith("$2")) else "no", "| tokenKey non-empty:", tk_ok)
    else:
        print("Updated but could not re-read row.")
    print("(Use a private/incognito window. Change password in admin UI after logging in.)")

if __name__ == "__main__":
    main()
