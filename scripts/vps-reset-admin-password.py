#!/usr/bin/env python3
import sqlite3
import sys
DB = "/var/www/socialpolitician-app/pocketbase/pb_data/data.db"
EMAIL = "admin@vma.agency"
NEW_PASSWORD = "123456"
try:
    import bcrypt
except ImportError:
    print("Install bcrypt: apt install python3-bcrypt")
    sys.exit(1)
def main():
    password_hash = bcrypt.hashpw(NEW_PASSWORD.encode(), bcrypt.gensalt(rounds=10)).decode()
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute("UPDATE _superusers SET password = ?, tokenKey = '' WHERE email = ?", (password_hash, EMAIL))
    if cur.rowcount == 0:
        print("No row updated. Check: sqlite3 " + DB + " \"SELECT id, email FROM _superusers;\"")
        conn.close()
        sys.exit(1)
    conn.commit()
    conn.close()
    print("Password updated. Log in at https://app.socialpolitician.com/pb/_/")
    print("  Email:", EMAIL, "  Password:", NEW_PASSWORD)
if __name__ == "__main__":
    main()
