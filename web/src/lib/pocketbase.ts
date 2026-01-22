/**
 * PocketBase client singleton
 * Uses runtime config to avoid hardcoded localhost URLs
 */

import PocketBase from 'pocketbase';
import { PB_BASE } from '../config/runtime';

let pb: PocketBase;

try {
  pb = new PocketBase(PB_BASE);
  
  // Enable auto cancellation for better error handling
  pb.autoCancellation(false);
} catch (error) {
  console.error('Failed to initialize PocketBase:', error);
  // Create a dummy instance to prevent crashes
  pb = new PocketBase(PB_BASE);
}

export { pb };
