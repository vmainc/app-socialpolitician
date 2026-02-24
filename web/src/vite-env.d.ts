/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_PB_BASE?: string;
  /** Facebook App ID required for Page Plugin embed (create at developers.facebook.com) */
  readonly VITE_FACEBOOK_APP_ID?: string;
  readonly MODE: string;
}