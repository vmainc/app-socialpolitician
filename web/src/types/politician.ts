/**
 * TypeScript types for Politician – matches PocketBase collection "politicians"
 * (pbc_3830222512) at http://127.0.0.1:8091
 */

export interface Politician {
  id: string;
  slug: string;
  name: string;
  state?: string | null;
  district?: string | null;
  political_party?: string | null;
  current_position?: string | null;
  position_start_date?: string | null;
  office_type?: 'senator' | 'representative' | 'governor' | 'other' | null;
  /** PocketBase file field – use pb.files.getUrl(record, record.photo) */
  photo?: string | null;
  website_url?: string | null;
  wikipedia_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  instagram_url?: string | null;
  x_url?: string | null;
  linkedin_url?: string | null;
  tiktok_url?: string | null;
  truth_social_url?: string | null;
  created?: string;
  updated?: string;
}

export interface Feed {
  id: string;
  politician: string;
  platform: 'twitter' | 'instagram' | 'youtube' | 'truth' | 'tiktok' | 'rss' | 'website';
  fetched_at: string;
  payload?: unknown;
  normalized_items?: unknown;
  created?: string;
  updated?: string;
}
