/**
 * Shared TypeScript types for President data
 * Used across multiple components to ensure type consistency
 */

export interface President {
  id: string;
  name: string;
  slug: string;
  portrait?: string;
  greeting?: string;
  rag_stats?: string;
  starter_prompts_json?: string;
  wikipedia_title?: string;
  wikipedia_url?: string;
  
  // Temperament fields (optional, added in Phase 1)
  temperament_summary?: string;
  temperament_tags?: string[] | string | null; // Can be JSON string from PB
  temperament_signature?: string;
  temperament_reaction?: string;
  
  // Conversation Persona fields (optional, added in Phase 2)
  persona_voice_summary?: string;
  persona_traits?: string[] | string | null;
  persona_rhetoric_patterns?: string[] | string | null;
  persona_pushback_playbook?: string | object | null;
  persona_red_lines?: string[] | string | null;
  persona_citation_style?: 'none' | 'light' | 'source-forward' | string | null;
  persona_accuracy_mode?: 'historical-only' | 'recent-but-cautious' | string | null;
  persona_example_snippets?: string[] | string | null;
  
  // Factual Profile fields (optional, added for Profile feature)
  // Term/service dates
  term_start?: string; // ISO date string (YYYY-MM-DD)
  term_end?: string | null; // ISO date string (YYYY-MM-DD), null for current president
  terms?: Array<{ start: string; end?: string | null }>; // Multi-term presidents
  
  // Basic factual profile
  party?: string; // e.g. "Republican", "Democratic"
  home_state?: string; // State abbreviation or full name
  birthplace?: string;
  birth_date?: string; // ISO date string
  death_date?: string | null; // ISO date string, null if alive
  vice_presidents?: string[] | string | null; // JSON array of strings
  spouse?: string;
  education?: string[] | string | null; // JSON array of strings
  professions?: string[] | string | null; // JSON array of strings
  major_events?: Array<{ label: string; date?: string; source_url?: string }> | string | null; // JSON array
  
  // Sources
  sources?: Array<{ label: string; url: string }> | string | null; // JSON array
}

/**
 * Normalize temperament_tags to a string array
 * Handles various formats PocketBase might return:
 * - JSON string: "[\"tag1\",\"tag2\"]"
 * - Array: ["tag1", "tag2"]
 * - null/undefined: []
 */
export function normalizeTemperamentTags(
  value: string[] | string | null | undefined
): string[] {
  if (!value) {
    return [];
  }
  
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== '');
  }
  
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== '');
      }
    } catch {
      // If parsing fails, treat as single tag (fallback)
      return value.trim() !== '' ? [value.trim()] : [];
    }
  }
  
  return [];
}

/**
 * Normalize persona JSON fields to arrays/objects
 */
export function parsePersonaJsonField<T>(field: string | T | null | undefined): T | null {
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
