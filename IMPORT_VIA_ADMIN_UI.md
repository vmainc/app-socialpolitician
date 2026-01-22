# Import Politicians via PocketBase Admin UI

Since the collection is at `http://127.0.0.1:8091/_/#/collections?collection=pbc_3830222512`, you can import the data directly through the admin UI.

## Quick Steps

1. **Access Admin UI** (you already have this open):
   - URL: `http://127.0.0.1:8091/_/#/collections?collection=pbc_3830222512`
   - Or via SSH tunnel: `ssh -L 8092:127.0.0.1:8091 doug@69.169.103.23` then open `http://localhost:8092/_/`

2. **Import JSON Files**:
   - In the PocketBase Admin UI, go to the `politicians` collection
   - Look for an **"Import"** or **"Bulk Import"** button (usually in the top toolbar)
   - Upload the JSON files from `/var/www/socialpolitician-app/data/`:
     - `senators_import_ready.json` (100 senators)
     - `governors_import_ready.json` (50 governors)  
     - `politicians_import_ready.json` (all combined - 585 total)

3. **Alternative: Manual Import via API in Browser Console**

   If the UI doesn't have an import button, you can use the browser console on the admin page:

   ```javascript
   // Get your auth token from the browser (you're already logged in)
   const token = localStorage.getItem('pocketbase_auth');
   const authData = JSON.parse(token);
   const adminToken = authData.token;

   // Import function
   async function importPoliticians(jsonData) {
     const url = 'http://127.0.0.1:8091/api/collections/pbc_3830222512/records';
     let created = 0;
     let errors = 0;
     
     for (const politician of jsonData) {
       try {
         const response = await fetch(url, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': adminToken
           },
           body: JSON.stringify(politician)
         });
         
         if (response.ok) {
           created++;
         } else {
           errors++;
           console.error('Error:', await response.text());
         }
         
         // Small delay to avoid rate limiting
         await new Promise(r => setTimeout(r, 50));
       } catch (e) {
         errors++;
         console.error('Exception:', e);
       }
     }
     
     console.log(`✅ Created: ${created}, ❌ Errors: ${errors}`);
   }

   // Load and import
   fetch('/data/senators_import_ready.json')
     .then(r => r.json())
     .then(importPoliticians);
   ```

4. **Verify Import**:
   ```bash
   curl https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=5
   ```

## Files Available

- `/var/www/socialpolitician-app/data/senators_import_ready.json` - 100 senators
- `/var/www/socialpolitician-app/data/governors_import_ready.json` - 50 governors
- `/var/www/socialpolitician-app/data/politicians_import_ready.json` - All combined (585 total)
