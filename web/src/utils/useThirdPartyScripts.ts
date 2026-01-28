/**
 * Utility for loading third-party scripts with deduplication
 * SSR-safe: only runs in browser
 */

// Module-scope map to track script loading promises
const scriptPromises = new Map<string, Promise<void>>();

/**
 * Load a script once, deduplicating concurrent requests
 * @param key Unique identifier for the script
 * @param src Script URL to load
 * @returns Promise that resolves when script is loaded
 */
export function loadScriptOnce(key: string, src: string): Promise<void> {
  // SSR safety: return resolved promise on server
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve();
  }

  // Check if script is already in DOM
  const existingScript = document.querySelector(`script[data-script-key="${key}"]`) as HTMLScriptElement;
  if (existingScript && existingScript.src === src) {
    return Promise.resolve();
  }

  // Check if we're already loading this script
  const existingPromise = scriptPromises.get(key);
  if (existingPromise) {
    return existingPromise;
  }

  // Create new script loading promise
  const promise = new Promise<void>((resolve, reject) => {
    // Check again after promise creation (race condition protection)
    const checkScript = document.querySelector(`script[data-script-key="${key}"]`) as HTMLScriptElement;
    if (checkScript && checkScript.src === src) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.setAttribute('data-script-key', key);
    script.src = src;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      scriptPromises.delete(key);
      reject(new Error(`Failed to load script: ${src}`));
    };

    document.head.appendChild(script);
  });

  scriptPromises.set(key, promise);
  return promise;
}
