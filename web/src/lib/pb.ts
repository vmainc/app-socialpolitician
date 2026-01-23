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
    return pb.files.getUrl(record, filename);
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
    const response = await pb.collection('politicians').getList<Politician>(
      page,
      perPage,
      {
        filter: filter || undefined,
        sort: sort || undefined,
        signal,
      }
    );

    return {
      items: response.items,
      totalItems: response.totalItems,
      page: response.page,
      perPage: response.perPage,
      totalPages: response.totalPages,
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
