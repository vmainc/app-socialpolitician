/**
 * PocketBase client wrapper for politician queries
 * Provides typed functions for listing and fetching politicians
 */

import { pb } from './pocketbase';
import { Politician } from '../types/politician';
import { PB_BASE } from '../config/runtime';

/**
 * Get base URL for PocketBase API
 */
export function getBaseUrl(): string {
  return PB_BASE || '/pb';
}

/**
 * Safe helper for negated contains in PocketBase filters
 * NEVER use !~ directly - PocketBase doesn't reliably support it
 * Use this helper instead: !(field~"value")
 * 
 * Runtime assertion: Throws error if filter string contains !~
 */
function assertNoNegatedContains(filter: string): void {
  if (filter.includes('!~')) {
    const error = new Error(
      `❌ FORBIDDEN: PocketBase filter contains !~ operator which is not reliably supported.\n` +
      `   Filter: ${filter}\n` +
      `   Use pbNotContains() helper instead: pbNotContains("field", "value")`
    );
    console.error(error);
    throw error;
  }
}

/**
 * Safe helper for negated contains in PocketBase filters
 * NEVER use !~ directly - PocketBase doesn't reliably support it
 * Use this helper instead: !(field~"value")
 */
export function pbNotContains(field: string, value: string): string {
  const safe = value.replace(/"/g, '\\"');
  return `!(${field}~"${safe}")`;
}

/**
 * Build a safe PocketBase filter for a specific office type
 * Uses ONLY office_type field - no negated contains (causes 400 errors)
 * Previous/Former filtering is done client-side for reliability
 */
export function buildOfficeFilter(
  officeType: 'senator' | 'representative' | 'governor'
): string {
  // SIMPLEST APPROACH: Use only office_type field
  // PocketBase doesn't reliably support negated contains (!~ or !(field~"value"))
  // We filter out Previous/Former on the client side instead
  
  if (officeType === 'senator') {
    // For senators, use OR to match either office_type OR current_position pattern
    // This handles cases where office_type might be missing but current_position is set
    return `(office_type="senator" || current_position~"U.S. Senator")`;
  }
  
  // For representatives and governors, just use office_type
  return `office_type="${officeType}"`;
}

/**
 * Get the profile route for a politician - just the slug at root level
 */
export function getPoliticianRoute(politician: Politician): string {
  return `/${politician.slug}`;
}

/**
 * Exclude records whose title indicates U.S. President (e.g. legacy data).
 */
export function isPresident(politician: Politician): boolean {
  const currentPosition = ((politician.office_title || politician.current_position) || '').toLowerCase();
  if (currentPosition.includes('president') &&
      (currentPosition.includes('united states') || currentPosition.includes('u.s.') || currentPosition.includes('us'))) {
    return true;
  }
  return false;
}

/**
 * Check if a politician record is a media organization (should be excluded)
 */
/**
 * Check if a politician is a previous/former representative who should be excluded
 */
export function isPreviousRepresentative(politician: Politician): boolean {
  const name = (politician.name || '').toLowerCase();
  // Use status field from schema, or fall back to office_title/current_position
  const status = (politician.status || '').toLowerCase();
  const currentPosition = ((politician.office_title || politician.current_position) || '').toLowerCase();
  
  // Check status field first (schema field)
  if (status === 'former' || status === 'retired') {
    if (politician.chamber === 'Representative' || politician.office_type === 'representative') {
      return true;
    }
  }
  
  // Check for "Previous" or "Former" in office_title/current_position (legacy)
  if (currentPosition.includes('previous') || currentPosition.includes('former')) {
    if (currentPosition.includes('representative') || 
        currentPosition.includes('congress') ||
        politician.office_type === 'representative' ||
        politician.chamber === 'Representative') {
      return true;
    }
  }
  
  // Known previous representatives
  const previousReps = [
    'beto o\'rourke',
    'robert o\'rourke',
    'beto o rourke',
    'robert o rourke',
  ];
  
  const normalizedName = name.toLowerCase().trim();
  if (previousReps.some(prev => normalizedName.includes(prev))) {
    return true;
  }
  
  return false;
}

export function isMediaEntry(politician: Politician): boolean {
  const name = (politician.name || '').toLowerCase();
  const slug = (politician.slug || '').toLowerCase();
  // Use office_title (new) or current_position (legacy) for backward compatibility
  const currentPosition = ((politician.office_title || politician.current_position) || '').toLowerCase();
  // Use official_website_domain (new) or website_url (legacy) for backward compatibility
  const website = ((politician.official_website_domain || politician.website_url) || '').toLowerCase();
  
  // Media-related keywords
  const mediaKeywords = [
    'media',
    'cnn',
    'fox news',
    'msnbc',
    'abc news',
    'cbs news',
    'nbc news',
    'news network',
    'broadcast',
    'television',
    'tv station',
    'radio station',
    'newspaper',
    'magazine',
    'publication',
    'press',
  ];
  
  // Social media platforms
  const socialMediaPlatforms = [
    'facebook',
    'quora',
    'reddit',
    'tiktok',
    'truth social',
    'tumblr',
    'wechat',
    'we chat',
    'weibo',
    'twitter',
    'instagram',
    'linkedin',
    'youtube',
    'snapchat',
    'pinterest',
    'tribel',
    'spill',
  ];
  
  // Check name for media keywords
  if (mediaKeywords.some(keyword => name.includes(keyword))) {
    return true;
  }
  
  // Check name for social media platforms
  if (socialMediaPlatforms.some(platform => name.includes(platform))) {
    return true;
  }
  
  // Check if name is just a social media platform (exact match or with .com)
  const nameWithoutCom = name.replace(/\.com$/, '').trim();
  if (socialMediaPlatforms.some(platform => nameWithoutCom === platform || nameWithoutCom === platform.replace(' ', ''))) {
    return true;
  }
  
  // Check slug (common patterns like "cnn-com", "facebook-com", etc.)
  if (slug.endsWith('-com') || slug.endsWith('.com') || 
      slug.endsWith('-org') || slug.endsWith('.org') ||
      slug.endsWith('-co-uk') || slug.endsWith('.co.uk') ||
      slug.includes('-cnn-') || slug.includes('-media-') || 
      slug === 'cnn-com' || slug === 'cnn.com') {
    return true;
  }
  
  // Check for social media platforms in slug
  if (socialMediaPlatforms.some(platform => {
    const platformSlug = platform.replace(' ', '-');
    return slug === platformSlug || slug === `${platformSlug}-com` || slug.startsWith(`${platformSlug}-`);
  })) {
    return true;
  }
  
  // Check for media domain patterns in slug (but not if it's part of a state name like "massachusetts")
  const mediaSlugPatterns = ['cnn', 'foxnews', 'msnbc', 'abcnews', 'cbsnews', 'nbcnews', 'telegraph', 'facebook', 'quora', 'reddit', 'tiktok', 'tumblr', 'wechat', 'weibo', 'tribel', 'spill'];
  if (mediaSlugPatterns.some(pattern => slug.includes(pattern) && !slug.includes('massachusetts'))) {
    // Only flag if it's clearly a media domain, not a person's name
    if (slug.match(/^[a-z]+(-com|-org|-co-uk)$/) || slug.match(/^[a-z-]+(facebook|quora|reddit|tiktok|tumblr|wechat|weibo|tribel|spill)/)) {
      return true;
    }
  }
  
  // Check office_title/current_position
  if (currentPosition.includes('media') || currentPosition.includes('news organization') || currentPosition.includes('journalist')) {
    return true;
  }
  
  // Check if website is a media domain or social media platform
  const mediaDomains = [
    'cnn.com',
    'foxnews.com',
    'msnbc.com',
    'abcnews.com',
    'cbsnews.com',
    'nbcnews.com',
    'reuters.com',
    'ap.org',
    'bloomberg.com',
    'wsj.com',
    'nytimes.com',
    'washingtonpost.com',
    'telegraph.co.uk',
    'facebook.com',
    'quora.com',
    'reddit.com',
    'tiktok.com',
    'truthsocial.com',
    'tumblr.com',
    'wechat.com',
    'weibo.com',
    'tribel.com',
    'spill-app.com',
  ];
  
  if (mediaDomains.some(domain => website.includes(domain))) {
    return true;
  }
  
  return false;
}

/**
 * Build file URL for a politician's photo
 * Uses collection name "politicians" if collectionId is not available
 */
export function buildFileUrl(record: Politician, filename: string | null | undefined): string {
  if (!filename) {
    return '';
  }
  
  const baseUrl = getBaseUrl();
  // PocketBase SDK's getUrl handles collection ID automatically, but we provide a fallback
  // The SDK method is preferred, but this can be used if needed
  try {
    return pb.files.getURL(record, filename);
  } catch (error) {
    // Fallback: construct URL manually using collection name
    // Format: /pb/api/files/{collectionName}/{recordId}/{filename}
    return `${baseUrl}/api/files/politicians/${record.id}/${filename}`;
  }
}

export interface ListPoliticiansParams {
  page?: number;
  perPage?: number;
  filter?: string;
  sort?: string;
  signal?: AbortSignal;
}

export interface ListPoliticiansResult {
  items: Politician[];
  totalItems: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * List politicians with filtering, sorting, and pagination
 */
export async function listPoliticians(
  params: ListPoliticiansParams = {}
): Promise<ListPoliticiansResult> {
  const {
    page = 1,
    perPage = 24,
    filter,
    sort = 'name',
    signal,
  } = params;

  try {
    // Build options object, only including defined non-empty values
    // This prevents PocketBase from seeing undefined or empty string values
    const options: any = { signal };
    
    if (filter && filter.trim()) {
      // Runtime assertion: prevent !~ usage
      assertNoNegatedContains(filter);
      options.filter = filter;
      console.log('🔍 PocketBase filter:', filter);
    }
    
    if (sort && sort.trim()) {
      options.sort = sort;
    }

    console.log('📡 Fetching from PocketBase:', {
      page,
      perPage,
      filter: options.filter || '(none)',
      sort: options.sort || '(default)',
      baseUrl: pb.baseUrl,
      collection: 'politicians',
      fullUrl: `${pb.baseUrl}/api/collections/politicians/records`,
    });

    const response = await pb.collection('politicians').getList<Politician>(
      page,
      perPage,
      options
    );

    console.log('✅ PocketBase response:', {
      totalItems: response.totalItems,
      itemsCount: response.items.length,
      page: response.page,
      totalPages: response.totalPages,
    });

    // Filter out media, title-based president entries, and previous representatives
    const filteredItems = response.items.filter(p => 
      !isMediaEntry(p) && 
      !isPresident(p) && 
      !isPreviousRepresentative(p)
    );
    
    // Adjust totalItems to account for filtered entries
    // Note: This is an approximation since we're filtering after fetching
    const filteredTotal = response.totalItems - (response.items.length - filteredItems.length);

    return {
      items: filteredItems,
      totalItems: filteredTotal,
      page: response.page,
      perPage: response.perPage,
      totalPages: Math.ceil(filteredTotal / perPage),
    };
  } catch (error: any) {
    // Handle abort errors gracefully
    if (error?.name === 'AbortError') {
      throw error;
    }
    
    console.error('❌ Failed to list politicians:', error);
    console.error('   Error details:', {
      message: error?.message,
      status: error?.status,
      response: error?.response,
      data: error?.data,
      url: error?.url,
    });
    throw new Error(`Failed to fetch politicians: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Get a single politician by ID
 */
export async function getPolitician(id: string): Promise<Politician> {
  try {
    return await pb.collection('politicians').getOne<Politician>(id);
  } catch (error: any) {
    console.error(`Failed to get politician ${id}:`, error);
    throw new Error(`Failed to fetch politician: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Get a politician by slug
 */
export async function getPoliticianBySlug(slug: string): Promise<Politician> {
  try {
    return await pb.collection('politicians').getFirstListItem<Politician>(
      `slug="${slug}"`
    );
  } catch (error: any) {
    console.error(`Failed to get politician by slug ${slug}:`, error);
    throw new Error(`Failed to fetch politician: ${error?.message || 'Unknown error'}`);
  }
}
