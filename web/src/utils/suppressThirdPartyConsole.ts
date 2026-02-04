/**
 * Suppress noisy console errors from Facebook/Twitter/YouTube embed scripts.
 * Import this first in main.tsx so it runs before any social widgets load.
 */

let installed = false;

export function installThirdPartyConsoleSuppression(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;

  const isWidgetError = (args: unknown[]): boolean => {
    const full = args
      .map((a) =>
        typeof a === 'object' && a !== null && 'message' in a
          ? (a as Error).message
          : String(a)
      )
      .join(' ');
    const patterns = [
      'ErrorUtils caught an error',
      'Could not find element',
      'DataStore.get',
      'namespace is required',
      '[Caught in: Module',
      '[Violation]',
      'Permissions policy violation',
      'unload is not allowed',
      'fburl.com/debugjs',
      'Subsequent non-fatal errors',
      '__elem_',
      '__inst_',
      'u_1_',
    ];
    return patterns.some((p) => full.includes(p));
  };

  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...args: unknown[]) => {
    if (isWidgetError(args)) return;
    origError.apply(console, args);
  };
  console.warn = (...args: unknown[]) => {
    if (isWidgetError(args)) return;
    origWarn.apply(console, args);
  };

  const origOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const msg = String(message ?? '');
    const src = String(source ?? '');
    if (msg.includes('removeChild') || msg.includes('NotFoundError')) return true;
    if (msg.includes('ErrorUtils') || msg.includes('Permissions policy violation')) return true;
    if (/facebook\.com|fbcdn\.net|fburl\.com|connect\.facebook\.net/.test(src)) return true;
    if (origOnError) return origOnError(message, source, lineno, colno, error);
    return false;
  };

  const origRejection = window.onunhandledrejection;
  window.onunhandledrejection = (ev) => {
    const msg = ev?.reason?.message ?? String(ev?.reason ?? '');
    if (/ErrorUtils|Could not find element|DataStore\.get|u_1_|__elem_|__inst_|fburl\.com/.test(msg)) {
      ev.preventDefault?.();
      return;
    }
    if (origRejection) origRejection.call(window, ev);
  };
}
