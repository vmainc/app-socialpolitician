/**
 * Runtime configuration for API endpoints
 * All API calls should use these constants instead of hardcoded URLs
 *
 * Production: same-origin /api and /pb (HTTPS, no mixed content).
 * Dev: connect to local PocketBase at http://127.0.0.1:8091 (override via VITE_PB_BASE).
 */

const isProd = import.meta.env.MODE === "production";
export const API_BASE = isProd ? "/api" : (import.meta.env.VITE_API_BASE ?? "/api");
export const PB_BASE = isProd ? "/pb" : (import.meta.env.VITE_PB_BASE ?? "http://127.0.0.1:8091");
export const MODE = import.meta.env.MODE;

// Log configuration on startup (non-sensitive)
if (typeof window !== "undefined") {
  console.log("Runtime Config:", { MODE, API_BASE, PB_BASE });
  
  // Diagnostic: Test PocketBase health endpoint
  if (isProd) {
    fetch(`${PB_BASE}/api/health`)
      .then(res => res.json())
      .then(data => {
        console.log("✅ PocketBase health check:", data);
      })
      .catch(err => {
        console.error("❌ PocketBase health check failed:", err);
        console.error("   PB_BASE:", PB_BASE);
        console.error("   Full URL would be:", window.location.origin + PB_BASE + "/api/health");
      });
  }
}