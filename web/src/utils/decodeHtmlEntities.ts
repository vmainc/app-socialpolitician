/**
 * Decode HTML entities in strings
 * Converts &aacute; to á, &amp; to &, etc.
 * 
 * @param text - Text that may contain HTML entities
 * @returns - Text with HTML entities decoded
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  
  // Create a temporary DOM element to decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}
