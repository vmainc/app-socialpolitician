/**
 * PocketBase client singleton
 * Uses runtime config (PB_BASE) so the same build works in dev and production.
 */

import PocketBase from 'pocketbase';
import { PB_BASE } from '../config/runtime';

let pb: PocketBase;

try {
  pb = new PocketBase(PB_BASE);
  
  // Enable auto cancellation for better error handling
  pb.autoCancellation(false);
  
  // Diagnostic logging
  if (typeof window !== "undefined") {
    console.log("PocketBase initialized with base URL:", PB_BASE);
    console.log("PocketBase client baseUrl:", pb.baseUrl);
  }
} catch (error) {
  console.error('Failed to initialize PocketBase:', error);
  // Create a dummy instance to prevent crashes
  pb = new PocketBase(PB_BASE);
}

export { pb };
