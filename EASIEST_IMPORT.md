# Easiest Import Method - PocketBase Admin UI

Since the browser console script needs an SSH tunnel, here's the **easiest method**:

## Method 1: Use PocketBase Admin UI Import Feature

1. **Open PocketBase Admin UI**:
   - URL: `http://127.0.0.1:8091/_/#/collections?collection=pbc_3830222512`
   - Make sure you're logged in

2. **Look for Import Button**:
   - In the collection view, look for an **"Import"**, **"Bulk Import"**, or **"Upload"** button
   - Usually in the top toolbar or under a menu

3. **Upload JSON Files**:
   - Click the import button
   - Select and upload:
     - `/var/www/socialpolitician-app/data/senators_import_ready.json`
     - `/var/www/socialpolitician-app/data/governors_import_ready.json`

## Method 2: Copy-Paste Individual Records

If there's no import button, you can manually create records:

1. Click **"New Record"** button
2. Fill in the fields manually (or copy-paste from JSON)
3. Save and repeat

## Method 3: Use Browser Console with SSH Tunnel

1. **Create SSH tunnel** (in terminal):
   ```bash
   ssh -L 8888:127.0.0.1:8888 doug@69.169.103.23
   ```
   Keep this running.

2. **In browser console**, run the script from `COPY_PASTE_THIS.js`

## Method 4: Direct File Access (If Admin UI Allows)

Some PocketBase versions allow you to:
1. Go to the collection
2. Click a menu (three dots) → "Import"
3. Select JSON file from your local machine

Try this first - it's the simplest!
