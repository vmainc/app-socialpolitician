/**
 * TypeScript types for Politician – matches PocketBase collection "politicians"
 * Collection ID: pbc_3830222512
 */

export interface Politician {
  id: string;
  slug: string;
  name: string;
  state?: string | null;
  district?: string | null;
  party?: 'Democrat' | 'Republican' | 'Independent' | 'Other' | 'Unknown' | null; // Schema: select field
  office_title?: string | null; // Schema: text field
  office_type?: string | null; // Schema: text field (fallback)
  chamber?: 'Senator' | 'Representative' | 'Governor' | 'Other' | 'Unknown' | null; // Schema: select field
  status?: 'Incumbent' | 'Challenger' | 'Former' | 'Retired' | 'Deceased' | 'Candidate' | 'Unknown' | null; // Schema: select field
  /** Short line under name (displayed as headline). Renamed from bio in PocketBase. */
  headline?: string | null;
  /** Long 2–3 paragraph synopsis for Biography accordion (no footnotes). */
  biography?: string | null;
  /** @deprecated Use headline. Kept for backward compatibility. */
  bio?: string | null;
  /** PocketBase file field – use pb.files.getUrl(record, record.photo) */
  photo?: string | null;
  official_website_domain?: string | null; // Schema field (was website_url)
  wikipedia_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  instagram_url?: string | null;
  x_url?: string | null;
  linkedin_url?: string | null;
  tiktok_url?: string | null;
  truth_social_url?: string | null;
  birth_date?: string | null;
  term_end_date?: string | null;
  created?: string;
  updated?: string;
  
  // Legacy field names for backward compatibility (map to new fields)
  political_party?: string | null; // Maps to party
  current_position?: string | null; // Maps to office_title
  website_url?: string | null; // Maps to official_website_domain
}

export interface Feed {
  id: string;
  politician: string;
  platform: 'twitter' | 'instagram' | 'youtube' | 'truth' | 'tiktok' | 'rss' | 'website';
  source?: string | null;
  fetched_at: string;
  payload?: unknown;
  normalized_items?: unknown;
  created?: string;
  updated?: string;
}
