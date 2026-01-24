/**
 * Normalize strings by removing accents and special characters
 * Useful for matching names with accents: Luján, García, etc.
 */

/**
 * Remove accents from a string
 * Handles: á, é, í, ó, ú, ü, ñ, ç, and other diacritical marks
 * 
 * @param str - Input string with potential accents
 * @returns - Normalized string without accents, lowercase and trimmed
 */
export function removeAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')                    // Decompose accented characters to base + combining marks
    .replace(/[\u0300-\u036f]/g, '')    // Remove all combining diacritical marks
    .toLowerCase()
    .trim();
}

/**
 * Normalize a full name for matching
 * Removes accents from all parts of the name
 * 
 * @param name - Full name
 * @returns - Normalized name
 */
export function normalizeName(name: string): string {
  return removeAccents(name);
}

/**
 * Extract and normalize last name
 * 
 * @param fullName - Full name
 * @returns - Normalized last name
 */
export function getNormalizedLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const lastName = parts[parts.length - 1];
  return removeAccents(lastName);
}

/**
 * Check if two names match after normalization
 * Useful for fuzzy matching politicians with accents in names
 * 
 * @param name1 - First name (as-is)
 * @param name2 - Second name (as-is)
 * @returns - true if names match after normalization
 */
export function namesMatchNormalized(name1: string, name2: string): boolean {
  return removeAccents(name1) === removeAccents(name2);
}

/**
 * Find best match from array of names after normalization
 * 
 * @param searchName - Name to search for
 * @param candidates - Array of candidate names to search through
 * @returns - Best matching name or null
 */
export function findBestNameMatch(searchName: string, candidates: string[]): string | null {
  const normalizedSearch = removeAccents(searchName);
  
  // Try exact normalized match first
  for (const candidate of candidates) {
    if (removeAccents(candidate) === normalizedSearch) {
      return candidate;
    }
  }
  
  // Try last name match
  const searchLastName = getNormalizedLastName(searchName);
  if (searchLastName.length > 2) {
    for (const candidate of candidates) {
      if (getNormalizedLastName(candidate) === searchLastName) {
        return candidate;
      }
    }
  }
  
  return null;
}

/**
 * Common accent mappings for reference
 * á → a, é → e, í → i, ó → o, ú → u
 * ñ → n, ç → c, ü → u
 * 
 * Example: Luján → lujan, García → garcia
 */
export const ACCENT_MAP: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  ü: 'u',
  ñ: 'n',
  ç: 'c',
  à: 'a',
  è: 'e',
  ì: 'i',
  ò: 'o',
  ù: 'u',
  â: 'a',
  ê: 'e',
  î: 'i',
  ô: 'o',
  û: 'u',
  ã: 'a',
  õ: 'o',
  ä: 'a',
  ë: 'e',
  ï: 'i',
  ö: 'o',
};
