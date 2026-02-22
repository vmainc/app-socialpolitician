# Fixing user_favorites 400 on List

Your `user_favorites` collection has:
- **user** → `_pb_users_auth_` (users auth collection) ✓
- **politician** → `pbc_3830222512`

If the **politicians** collection on your server has a **different ID** than `pbc_3830222512`, the relation is broken and listing can return 400.

## 1. Check politicians collection ID

In PocketBase Admin: **Collections** → open **politicians** → check the collection **ID** (in the URL or in the collection settings). Note it.

## 2. If the ID is not `pbc_3830222512`

1. Go to **Collections** → **user_favorites** → **Fields**.
2. Open the **politician** field (edit).
3. Under **Collection**, select **politicians** (by name) so it uses the correct collection.
4. Save.
5. Reload the Account page and try again.

## 3. If the ID is `pbc_3830222512`

Then the relation is correct. The 400 may be from something else (e.g. index or server error). On the VPS run:

```bash
sudo journalctl -u socialpolitician-app-pocketbase -n 50 --no-pager -f
```

Reproduce the 400 (open Account page), then check the log lines for the real error (e.g. panic or "invalid").

## 4. Optional: test list with curl

From your machine (replace `YOUR_JWT_TOKEN` with the token from browser Local Storage → `pb_auth` → `token`):

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
  -H "Authorization: YOUR_JWT_TOKEN" \
  "https://app.socialpolitician.com/pb/api/collections/user_favorites/records?page=1&perPage=100&sort=-created"
```

The response body may include a more specific error message.
