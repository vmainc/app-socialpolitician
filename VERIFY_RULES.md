# Verify PocketBase Rules Are Saved

The API is still returning 0 records, which means the rules might not have saved properly.

## Quick Check

1. **Open PocketBase Admin UI:**
   ```bash
   ssh -L 8092:127.0.0.1:8091 doug@69.169.103.23
   ```
   Then open: `http://localhost:8092/_/`

2. **Check Rules:**
   - Go to **Collections** → **politicians**
   - Click **Settings** (gear icon)
   - Click **API Rules** tab
   - **Verify** the rules show:
     - List/Search rule: `id != ""`
     - View rule: `id != ""`
   - If they're empty or show "Superusers only", set them again

3. **Save:**
   - Make sure to click **"Save changes"** button at the bottom
   - Wait for confirmation message

## Alternative Rule Syntax

If `id != ""` isn't working, try this (always evaluates to true):

**List/Search rule:**
```
@request.auth.id = "" || @request.auth.id != ""
```

**View rule:**
```
@request.auth.id = "" || @request.auth.id != ""
```

This means: "allow if user is not authenticated OR if user is authenticated" (always true).

## After Saving

1. Restart PocketBase:
   ```bash
   sudo systemctl restart socialpolitician-app-pocketbase.service
   ```

2. Test:
   ```bash
   curl http://127.0.0.1:8091/api/collections/politicians/records?page=1&perPage=1
   ```

3. Should return records, not empty array.
