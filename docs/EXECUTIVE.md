# Executive Branch (President, VP, Cabinet)

The **Executive** page lists the President, Vice President, and Cabinet members. They use the same `politicians` collection with `office_type`: `president`, `vice_president`, or `cabinet`.

## Data

- **Seed file:** `data/executive_import_ready.json`  
  Edit this to update who appears (e.g. new administration). Each record must have:
  - `name`, `slug`, `office_type` (`"president"` | `"vice_president"` | `"cabinet"`)
  - `current_position` (e.g. "President of the United States", "Secretary of State")
  - Optional: `wikipedia_url`, `political_party`, `state`, social URLs

- **Import:** Executives are imported with the rest of the politicians when you run:
  ```bash
  npm run pb:import
  ```
  (with `POCKETBASE_URL`, `POCKETBASE_ADMIN_EMAIL`, `POCKETBASE_ADMIN_PASSWORD` set.)

## Images and social info (like everyone else)

1. **Wikipedia URLs** (if missing):  
   `node scripts/fetch_wikipedia_urls.mjs` (or `DRY_RUN=false` to apply).

2. **Biography and headline from Wikipedia:**  
   ```bash
   npm run pb:backfill-bios:executive
   ```
   Or: `npx tsx server/src/scripts/backfillBiosFromWikipedia.ts --office-type=executive`  
   Fetches ~500-word bio and first-sentence headline from each executive’s `wikipedia_url`.

3. **Portraits (scrape from Wikipedia):**  
   - **Scrape** executive branch only (President, VP, Cabinet; saves to `portraits/to-label/`):
     ```bash
     POCKETBASE_URL=http://127.0.0.1:8091 \
     POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
     POCKETBASE_ADMIN_PASSWORD='...' \
     npm run scrape:executive
     ```
   - **Upload** to PocketBase (attach to records by slug):  
     `node scripts/upload_portraits.js` (or `upload_portraits_by_slug.js` if using `portraits/uploaded/`).  
   Executives need `wikipedia_url` (or a name that matches a Wikipedia title) for the scraper to find images.

4. **Social links (prefer Google Knowledge Panel):**  
   - **President & VP (official accounts):**  
     ```bash
     npm run pb:backfill-executive-social
     ```
     Sets White House website and official X/Facebook/Instagram/YouTube when those fields are empty.  
   - **From Google (right-side panel) — recommended:**  
     Get social profiles and website from the panel that appears when you search someone on Google. Requires a [SerpApi](https://serpapi.com/) API key (free tier available).  
     ```bash
     SERPAPI_API_KEY=your_key npm run pb:enrich:social:google:executive
     ```
     Or for all politicians: `npm run pb:enrich:social:google` (optionally add `--office-type=senator`, etc.).  
   - **From Wikipedia (fallback):**  
     ```bash
     npm run pb:enrich:social:executive
     ```
     Fetches from each executive’s Wikipedia page if you don’t use SerpApi or need to fill remaining blanks.

## Route and nav

- **Page:** `/executive`
- **Nav:** “Executive” link in the main navigation.
- **Profiles:** Executive profiles use the same profile page; back link goes to `/executive`.
