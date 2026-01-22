# Create Politicians Collection

The `politicians` collection is missing from PocketBase, which is causing 404 errors in the app.

## Option 1: Via PocketBase Admin UI (Recommended)

1. **Create SSH tunnel** (from your local machine):
   ```bash
   ssh -L 8091:127.0.0.1:8091 doug@69.169.103.23
   ```

2. **Access PocketBase Admin**:
   - Open: http://localhost:8091/_/
   - Login with:
     - Email: `admin@vma.agency`
     - Password: `VMAmadmia42O200!`

3. **Create Collection**:
   - Click "New Collection"
   - Name: `politicians`
   - Type: `Base`
   - Click "Create"

4. **Add Fields** (based on `web/src/types/politician.ts`):
   - `name` (text, required)
   - `slug` (text, required, unique)
   - `office_type` (select: senator, representative, governor, other)
   - `state` (text, optional)
   - `district` (text, optional)
   - `political_party` (text, optional)
   - `current_position` (text, optional)
   - `position_start_date` (date, optional)
   - `photo` (file, optional, max 1)
   - `website_url` (url, optional)
   - `wikipedia_url` (url, optional)
   - `facebook_url` (url, optional)
   - `youtube_url` (url, optional)
   - `instagram_url` (url, optional)
   - `x_url` (url, optional)
   - `linkedin_url` (url, optional)
   - `tiktok_url` (url, optional)
   - `truth_social_url` (url, optional)

5. **Set Rules**:
   - List Rule: (empty - public read)
   - View Rule: (empty - public read)
   - Create/Update/Delete: (null - admin only)

## Option 2: Via Script (if admin API works)

```bash
cd /var/www/socialpolitician-app
POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD=VMAmadmia42O200! \
npx tsx server/src/scripts/createPoliticiansCollectionNow.ts
```

## Verification

After creating the collection, verify it works:
```bash
curl https://app.socialpolitician.com/pb/api/collections/politicians/records?page=1&perPage=1
```

You should see JSON data instead of a 404 error.
