# Feeds collection – original design vs current behavior

## Current behavior (what the app actually uses)

Profiles are driven by the **politicians** collection and two front-end modules:

1. **PoliticianProfile** (`web/src/pages/PoliticianProfile.tsx`)
   - Loads one record from `pb.collection('politicians')` by slug.
   - Passes that politician into:
     - **ProfileNewsFeed** – uses `politician.name` to fetch **Google News RSS** (via `/api/news` or CORS proxies). No PocketBase collection.
     - **SocialEmbeds** – uses `politician` URLs (x_url, facebook_url, youtube_url, etc.) to embed X, Facebook, YouTube. No PocketBase collection.

So the **feeds** collection is **not** used by the current profile page.

## Where the “feeds” collection was used (original design)

The idea was: store fetched feed items per politician in PocketBase.

| Location | What it does |
|----------|----------------|
| **web/pages/PoliticianProfile.tsx** | Older duplicate profile page. Loads `pb.collection('feeds').getFullList({ filter: \`politician="${id}"\` })` and renders a “Full Feeds” section (platform, fetched_at, normalized_items). |
| **web/src/types/politician.ts** | `Feed` interface: id, politician, platform, fetched_at, payload, normalized_items. |
| **pocketbase/pb_migrations/1769088292_created_feeds.js** | Migration that creates the `feeds` collection (with skip-if-exists). |
| **scripts/create_feeds_collection.js** | Standalone script to create the feeds collection and indexes. |
| **pb_migrations/create_feeds_collection.js** | Another migration-style script for the feeds collection. |

The **feeds** collection is empty because nothing in the current app writes to it; the live profile uses politicians + ProfileNewsFeed + SocialEmbeds only.

## Optional cleanup

- You can **delete the `feeds` collection** in PocketBase admin if you don’t plan to store feed items in PB.
- The duplicate **web/pages/PoliticianProfile.tsx** has been updated to stop calling the feeds collection so it matches the src profile behavior.
