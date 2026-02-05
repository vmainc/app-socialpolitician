# Not used for app.socialpolitician.com production

This folder contains migrations from **other projects** (e.g. voices of the presidency).  
**Production for app.socialpolitician.com uses `pocketbase/pb_migrations` only.**

On the VPS, ensure:
```bash
cd /var/www/socialpolitician-app/pb_linux
rm -f pb_migrations
ln -sf ../pocketbase/pb_migrations pb_migrations
```
Then restart PocketBase.
