# Import Politicians - Step by Step

## Collection Info
- **Collection ID**: `pbc_3830222512`
- **Collection Name**: `politicians`
- **Admin UI**: `http://127.0.0.1:8091/_/#/collections?collection=pbc_3830222512`

## Method 1: Browser Console (Easiest)

1. **Open PocketBase Admin UI**:
   - URL: `http://127.0.0.1:8091/_/#/collections?collection=pbc_3830222512`
   - Make sure you're logged in

2. **Open Browser Console**:
   - Press `F12` or right-click → Inspect → Console tab

3. **Load the import script**:
   - Copy the entire contents of `import-politicians-browser.js`
   - Paste into the console and press Enter
   - Wait for "✅ Script loaded!" message

4. **Import the data**:

   **Option A: If you have JSON files served via HTTP**
   ```javascript
   // First, on the server, start HTTP server:
   // cd /var/www/socialpolitician-app/data && python3 -m http.server 8888
   // Then create SSH tunnel: ssh -L 8888:127.0.0.1:8888 doug@69.169.103.23
   // Then run:
   await importFromURLs();
   ```

   **Option B: Paste JSON directly**
   ```javascript
   // Copy the contents of senators_import_ready.json
   // Then paste here:
   const senatorsData = [
     {
       "name": "Angela D. Alsobrooks",
       "slug": "angela-d-alsobrooks",
       "state": "Maryland",
       // ... rest of the data
     },
     // ... more records
   ];
   
   // Then import:
   await importPoliticians(senatorsData, "Senators");
   ```

   **Option C: Load from file (if accessible)**
   ```javascript
   // If you can access the file via HTTP
   const data = await loadJSON('http://127.0.0.1:8888/senators_import_ready.json');
   await importPoliticians(data, "Senators");
   ```

## Method 2: PocketBase Admin UI Import Button

1. In the PocketBase Admin UI, look for an **"Import"** or **"Bulk Import"** button
2. Click it and upload:
   - `senators_import_ready.json` (100 senators)
   - `governors_import_ready.json` (50 governors)
   - `politicians_import_ready.json` (all combined)

## Method 3: Serve JSON Files and Use Browser Script

1. **On the server**, start HTTP server:
   ```bash
   ssh doug@69.169.103.23
   cd /var/www/socialpolitician-app/data
   python3 -m http.server 8888
   ```

2. **Create SSH tunnel** (in a new terminal):
   ```bash
   ssh -L 8888:127.0.0.1:8888 doug@69.169.103.23
   ```

3. **In browser console**, run:
   ```javascript
   await importFromURLs();
   ```

## Verify Import

After importing, check:
```bash
curl https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=5
```

Or in the browser console:
```javascript
const response = await fetch('http://127.0.0.1:8091/api/collections/pbc_3830222512/records?page=1&perPage=5', {
  headers: { 'Authorization': adminToken }
});
const data = await response.json();
console.log(`Total: ${data.totalItems}, Showing: ${data.items.length}`);
```

## Files Available

- `/var/www/socialpolitician-app/data/senators_import_ready.json` - 100 senators
- `/var/www/socialpolitician-app/data/governors_import_ready.json` - 50 governors
- `/var/www/socialpolitician-app/data/politicians_import_ready.json` - All combined (585 total)
