/**
 * PocketBase client singleton
 * Uses runtime config to avoid hardcoded localhost URLs
 */

import PocketBase from 'pocketbase';
import { PB_BASE } from '../config/runtime';

export const pb = new PocketBase(PB_BASE);
