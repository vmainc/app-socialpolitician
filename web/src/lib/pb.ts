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
 * List of all U.S. Presidents (for filtering)
 */
const US_PRESIDENTS = [
  'George Washington', 'John Adams', 'Thomas Jefferson', 'James Madison',
  'James Monroe', 'John Quincy Adams', 'Andrew Jackson', 'Martin Van Buren',
  'William Henry Harrison', 'John Tyler', 'James K. Polk', 'Zachary Taylor',
  'Millard Fillmore', 'Franklin Pierce', 'James Buchanan', 'Abraham Lincoln',
  'Andrew Johnson', 'Ulysses S. Grant', 'Rutherford B. Hayes', 'James A. Garfield',
  'Chester A. Arthur', 'Grover Cleveland', 'Benjamin Harrison', 'William McKinley',
  'Theodore Roosevelt', 'William Howard Taft', 'Woodrow Wilson', 'Warren G. Harding',
  'Calvin Coolidge', 'Herbert Hoover', 'Franklin D. Roosevelt', 'Harry S. Truman',
  'Dwight D. Eisenhower', 'John F. Kennedy', 'Lyndon B. Johnson', 'Richard Nixon',
  'Gerald Ford', 'Jimmy Carter', 'Ronald Reagan', 'George H. W. Bush',
  'Bill Clinton', 'George W. Bush', 'Barack Obama', 'Donald Trump', 'Joe Biden'
];

/**
 * Check if a politician record is a U.S. President (should be excluded)
 */
export function isPresident(politician: Politician): boolean {
  const name = (politician.name || '').trim();
  const currentPosition = (politician.current_position || '').toLowerCase();
  
  // Check if name matches any president (exact or partial match)
  const normalizedName = name.toLowerCase().trim();
  for (const president of US_PRESIDENTS) {
    const normalizedPresident = president.toLowerCase().trim();
    // Exact match
    if (normalizedName === normalizedPresident) {
      return true;
    }
    
    // Remove middle initials and periods for matching (e.g., "Warren G. Harding" -> "warren harding")
    const nameWithoutMiddle = normalizedName.replace(/\s+[a-z]\.\s+/g, ' ').replace(/\s+/g, ' ').trim();
    const presidentWithoutMiddle = normalizedPresident.replace(/\s+[a-z]\.\s+/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (nameWithoutMiddle === presidentWithoutMiddle) {
      return true;
    }
    
    // Check if name contains president's last name (for cases like "Warren G. Harding", "Ulysses S. Grant")
    const presidentParts = normalizedPresident.split(/\s+/).filter(p => p.length > 1 && !p.match(/^[a-z]\.?$/));
    const nameParts = normalizedName.split(/\s+/).filter(p => p.length > 1 && !p.match(/^[a-z]\.?$/));
    
    if (presidentParts.length > 1 && nameParts.length > 1) {
      // Match last name
      const presidentLastName = presidentParts[presidentParts.length - 1];
      const nameLastName = nameParts[nameParts.length - 1];
      if (presidentLastName === nameLastName && presidentLastName.length > 3) {
        // Also check first name to reduce false positives
        const presidentFirstName = presidentParts[0];
        const nameFirstName = nameParts[0];
        if (presidentFirstName === nameFirstName || 
            (presidentFirstName.length > 2 && nameFirstName.startsWith(presidentFirstName.substring(0, 3)))) {
          return true;
        }
      }
    }
  }
  
  // Check current_position for president-related terms
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
  const currentPosition = (politician.current_position || '').toLowerCase();
  
  // Check for "Previous" or "Former" in current_position
  if (currentPosition.includes('previous') || currentPosition.includes('former')) {
    if (currentPosition.includes('representative') || 
        currentPosition.includes('congress') ||
        politician.office_type === 'representative') {
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
  const currentPosition = (politician.current_position || '').toLowerCase();
  const website = (politician.website_url || '').toLowerCase();
  
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
    'twitter',
    'instagram',
    'linkedin',
    'youtube',
    'snapchat',
    'pinterest',
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
  const mediaSlugPatterns = ['cnn', 'foxnews', 'msnbc', 'abcnews', 'cbsnews', 'nbcnews', 'telegraph', 'facebook', 'quora', 'reddit', 'tiktok', 'tumblr', 'wechat'];
  if (mediaSlugPatterns.some(pattern => slug.includes(pattern) && !slug.includes('massachusetts'))) {
    // Only flag if it's clearly a media domain, not a person's name
    if (slug.match(/^[a-z]+(-com|-org|-co-uk)$/) || slug.match(/^[a-z-]+(facebook|quora|reddit|tiktok|tumblr|wechat)/)) {
      return true;
    }
  }
  
  // Check current_position
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
      options.filter = filter;
    }
    
    if (sort && sort.trim()) {
      options.sort = sort;
    }

    const response = await pb.collection('politicians').getList<Politician>(
      page,
      perPage,
      options
    );

    // Filter out media entries, presidents, and previous representatives
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
    
    console.error('Failed to list politicians:', error);
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
