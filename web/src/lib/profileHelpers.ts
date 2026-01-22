/**
 * Helper functions for formatting President profile data
 * Strict TypeScript - no `any` types
 */

import { President } from '../types/president';

/**
 * Format a date string to human-readable format
 * Uses Intl.DateTimeFormat for locale-aware formatting
 */
export function formatDateHuman(dateString: string | undefined | null): string | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return null;
  }
}

/**
 * Format a term range from start and end dates
 * Returns "Jan 20, 2017 – Jan 20, 2021" or "Jan 20, 2025 – Present"
 */
export function formatTermRange(
  termStart: string | undefined | null,
  termEnd: string | undefined | null
): string | null {
  if (!termStart) return null;
  
  const startFormatted = formatDateHuman(termStart);
  if (!startFormatted) return null;
  
  if (!termEnd) {
    return `${startFormatted} – Present`;
  }
  
  const endFormatted = formatDateHuman(termEnd);
  if (!endFormatted) return null;
  
  return `${startFormatted} – ${endFormatted}`;
}

/**
 * Format multiple terms for multi-term presidents
 * Returns "Jan 20, 2017 – Jan 20, 2021; Jan 20, 2025 – Present"
 */
export function formatTerms(
  terms: Array<{ start: string; end?: string | null }> | undefined | null
): string | null {
  if (!terms || !Array.isArray(terms) || terms.length === 0) return null;
  
  const formatted = terms
    .map((term) => formatTermRange(term.start, term.end || null))
    .filter((str): str is string => str !== null);
  
  if (formatted.length === 0) return null;
  
  return formatted.join('; ');
}

/**
 * Compute the "Served" label for a president
 * Prefers terms[] array if available, otherwise uses term_start/term_end
 */
export function computeServedLabel(president: President): string | null {
  // Prefer terms[] array for multi-term presidents
  if (president.terms && Array.isArray(president.terms) && president.terms.length > 0) {
    return formatTerms(president.terms);
  }
  
  // Fall back to term_start/term_end
  return formatTermRange(president.term_start, president.term_end || null);
}

/**
 * Parse JSON field that might be string or already parsed
 */
function parseJsonField<T>(field: string | T | null | undefined): T | null {
  if (!field) return null;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T;
    } catch {
      return null;
    }
  }
  return field as T;
}

/**
 * Normalize array fields that might be JSON strings
 */
export function normalizeArrayField(
  field: string[] | string | null | undefined
): string[] {
  if (!field) return [];
  if (Array.isArray(field)) {
    return field.filter((item): item is string => typeof item === 'string');
  }
  if (typeof field === 'string') {
    const parsed = parseJsonField<string[]>(field);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  }
  return [];
}

/**
 * Normalize major_events array
 */
export function normalizeMajorEvents(
  field: Array<{ label: string; date?: string; source_url?: string }> | string | null | undefined
): Array<{ label: string; date?: string; source_url?: string }> {
  if (!field) return [];
  if (Array.isArray(field)) {
    return field.filter((item): item is { label: string; date?: string; source_url?: string } => 
      typeof item === 'object' && item !== null && 'label' in item && typeof item.label === 'string'
    );
  }
  if (typeof field === 'string') {
    const parsed = parseJsonField<Array<{ label: string; date?: string; source_url?: string }>>(field);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is { label: string; date?: string; source_url?: string } => 
        typeof item === 'object' && item !== null && 'label' in item && typeof item.label === 'string'
      );
    }
  }
  return [];
}

/**
 * Normalize sources array
 */
export function normalizeSources(
  field: Array<{ label: string; url: string }> | string | null | undefined
): Array<{ label: string; url: string }> {
  if (!field) return [];
  if (Array.isArray(field)) {
    return field.filter((item): item is { label: string; url: string } => 
      typeof item === 'object' && item !== null && 'label' in item && 'url' in item &&
      typeof item.label === 'string' && typeof item.url === 'string'
    );
  }
  if (typeof field === 'string') {
    const parsed = parseJsonField<Array<{ label: string; url: string }>>(field);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is { label: string; url: string } => 
        typeof item === 'object' && item !== null && 'label' in item && 'url' in item &&
        typeof item.label === 'string' && typeof item.url === 'string'
      );
    }
  }
  return [];
}

/**
 * Get all sources for a president (sources array + wikipedia_url if present)
 */
export function getAllSources(president: President): Array<{ label: string; url: string }> {
  const sources = normalizeSources(president.sources);
  
  // Always include Wikipedia if present
  if (president.wikipedia_url) {
    const hasWikipedia = sources.some(s => s.url === president.wikipedia_url);
    if (!hasWikipedia) {
      sources.unshift({
        label: 'Wikipedia',
        url: president.wikipedia_url,
      });
    }
  }
  
  return sources;
}
