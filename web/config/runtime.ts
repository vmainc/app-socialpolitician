/**
 * Runtime configuration for API endpoints
 * All API calls should use these constants instead of hardcoded URLs
 *
 * Production: same-origin /api and /pb (HTTPS, no mixed content).
 * Dev: connect to local PocketBase (override via VITE_PB_BASE env var).
 */

const isProd = import.meta.env.MODE === "production";
export const API_BASE = isProd ? "/api" : (import.meta.env.VITE_API_BASE ?? "/api");
// Use environment variable if set, otherwise use /pb (works in both dev and prod via Vite proxy)
export const PB_BASE = import.meta.env.VITE_PB_BASE || "/pb";
export const MODE = import.meta.env.MODE;

// Log configuration on startup (non-sensitive)
if (typeof window !== "undefined") {
  console.log("Runtime Config:", { MODE, API_BASE, PB_BASE });
}