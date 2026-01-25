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
 * Check if a politician record is a media organization (should be excluded)
 */
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
  
  // Check name
  if (mediaKeywords.some(keyword => name.includes(keyword))) {
    return true;
  }
  
  // Check slug (common patterns like "cnn-com")
  // Only flag if slug ends with "-com" or contains media keywords as standalone words
  if (slug.endsWith('-com') || slug.endsWith('.com') || 
      slug.includes('-cnn-') || slug.includes('-media-') || 
      slug === 'cnn-com' || slug === 'cnn.com') {
    return true;
  }
  
  // Check for media domain patterns in slug (but not if it's part of a state name like "massachusetts")
  const mediaSlugPatterns = ['cnn', 'foxnews', 'msnbc', 'abcnews', 'cbsnews', 'nbcnews'];
  if (mediaSlugPatterns.some(pattern => slug.includes(pattern) && !slug.includes('massachusetts'))) {
    // Only flag if it's clearly a media domain, not a person's name
    if (slug.match(/^[a-z]+(-com|-org)$/)) {
      return true;
    }
  }
  
  // Check current_position
  if (currentPosition.includes('media') || currentPosition.includes('news organization') || currentPosition.includes('journalist')) {
    return true;
  }
  
  // Check if website is a media domain
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

    // Filter out media entries
    const filteredItems = response.items.filter(p => !isMediaEntry(p));
    
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
