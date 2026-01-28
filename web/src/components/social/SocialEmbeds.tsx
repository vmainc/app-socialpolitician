/**
 * Social Embeds Component
 * Displays X (Twitter), Facebook, and YouTube embeds for politicians
 * SSR-safe and defensive against missing/invalid URLs
 */

import { useEffect, useRef, useState } from 'react';
import { loadScriptOnce } from '../../utils/useThirdPartyScripts';

interface SocialEmbedsProps {
  politician: Record<string, any>;
}

// Extend Window interface for third-party scripts
declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load: (element: HTMLElement | null) => void;
      };
    };
    FB?: {
      XFBML?: {
        parse: (element: HTMLElement | null) => void;
      };
    };
  }
}

/**
 * Helper: Clean and trim string, return empty string if invalid
 */
function cleanStr(v: any): string {
  if (typeof v !== 'string') return '';
  return v.trim();
}

/**
 * Helper: Validate and return safe HTTP/HTTPS URL, or empty string
 */
function safeHttpUrl(v: any): string {
  const str = cleanStr(v);
  if (!str) return '';
  
  try {
    const url = new URL(str);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.href;
    }
  } catch {
    // Invalid URL
  }
  
  return '';
}

/**
 * Parse X/Twitter profile URL
 * Accepts https://x.com/<handle> or https://twitter.com/<handle>
 * Returns normalized https://x.com/<handle> or empty string
 */
function parseXProfileUrl(url: string): string {
  const safeUrl = safeHttpUrl(url);
  if (!safeUrl) return '';
  
  try {
    const urlObj = new URL(safeUrl);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Must be x.com or twitter.com
    if (hostname !== 'x.com' && hostname !== 'twitter.com' && hostname !== 'www.x.com' && hostname !== 'www.twitter.com') {
      return '';
    }
    
    // Extract handle from path
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    if (pathParts.length === 0) return '';
    
    const handle = pathParts[0];
    if (!handle || handle.length === 0) return '';
    
    // Normalize to x.com
    return `https://x.com/${handle}`;
  } catch {
    return '';
  }
}

/**
 * Parse Facebook page URL
 * Returns normalized safe URL or empty string
 */
function parseFacebookPageUrl(url: string): string {
  return safeHttpUrl(url);
}

/**
 * Parse YouTube URL
 * Returns object with channelUrl and optional embedUrl
 */
function parseYouTube(url: string): { channelUrl: string; embedUrl?: string } {
  const safeUrl = safeHttpUrl(url);
  if (!safeUrl) {
    return { channelUrl: '' };
  }
  
  try {
    const urlObj = new URL(safeUrl);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Must be youtube.com or youtu.be
    if (hostname !== 'youtube.com' && hostname !== 'www.youtube.com' && hostname !== 'youtu.be') {
      return { channelUrl: '' };
    }
    
    // Check for video ID (youtu.be/<id> or youtube.com/watch?v=<id>)
    let videoId: string | null = null;
    if (hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1); // Remove leading /
    } else {
      videoId = urlObj.searchParams.get('v');
    }
    
    if (videoId) {
      return {
        channelUrl: safeUrl,
        embedUrl: `https://www.youtube.com/embed/${videoId}`
      };
    }
    
    // Check for playlist
    const playlistId = urlObj.searchParams.get('list');
    if (playlistId) {
      return {
        channelUrl: safeUrl,
        embedUrl: `https://www.youtube.com/embed/videoseries?list=${playlistId}`
      };
    }
    
    // Just return channel URL (no embed)
    return { channelUrl: safeUrl };
  } catch {
    return { channelUrl: '' };
  }
}

export default function SocialEmbeds({ politician }: SocialEmbedsProps) {
  const xWrapRef = useRef<HTMLDivElement>(null);
  const fbWrapRef = useRef<HTMLDivElement>(null);
  const [xLoaded, setXLoaded] = useState(false);
  const [fbLoaded, setFbLoaded] = useState(false);

  // Parse URLs
  const xProfileUrl = parseXProfileUrl(politician?.x_url);
  const facebookUrl = parseFacebookPageUrl(politician?.facebook_url);
  const youtube = parseYouTube(politician?.youtube_url);

  // Booleans
  const hasX = xProfileUrl !== '';
  const hasFacebook = facebookUrl !== '';
  const hasYouTube = youtube.channelUrl !== '';
  const hasAny = hasX || hasFacebook || hasYouTube;

  // Initialize X timeline embed
  useEffect(() => {
    if (!hasX || !xWrapRef.current) return;

    let mounted = true;
    let anchorElement: HTMLAnchorElement | null = null;

    async function initX() {
      try {
        await loadScriptOnce('x-widgets', 'https://platform.twitter.com/widgets.js');
        
        if (!mounted || !xWrapRef.current) return;
        
        // Safely clear existing content
        // Use innerHTML directly to avoid removeChild issues with third-party widgets
        const container = xWrapRef.current;
        try {
          container.innerHTML = '';
        } catch (e) {
          // If innerHTML fails, try removeChild as fallback
          try {
            while (container.firstChild) {
              const child = container.firstChild;
              if (child.parentNode === container) {
                container.removeChild(child);
              } else {
                break; // Child was moved, stop trying
              }
            }
          } catch (e2) {
            // Ignore cleanup errors
          }
        }
        
        // Create timeline anchor
        anchorElement = document.createElement('a');
        anchorElement.className = 'twitter-timeline';
        anchorElement.href = xProfileUrl;
        anchorElement.setAttribute('data-height', '600');
        anchorElement.textContent = 'View posts';
        container.appendChild(anchorElement);
        
        // Wait for twttr to be available and load
        let attempts = 0;
        const checkTwttr = () => {
          if (window.twttr?.widgets && container) {
            try {
              window.twttr.widgets.load(container);
              setXLoaded(true);
            } catch (e) {
              console.warn('Failed to load X widget:', e);
            }
          } else if (attempts < 20 && mounted) {
            attempts++;
            setTimeout(checkTwttr, 100);
          }
        };
        checkTwttr();
      } catch (error) {
        console.warn('Failed to load X widgets:', error);
      }
    }

    initX();

    return () => {
      mounted = false;
      // Cleanup: safely remove content
      // Use innerHTML directly to avoid removeChild issues with third-party widgets
      if (xWrapRef.current) {
        try {
          // Check if element still exists and is in the DOM
          if (xWrapRef.current.parentNode) {
            xWrapRef.current.innerHTML = '';
          }
        } catch (e) {
          // Silently ignore cleanup errors
        }
      }
    };
  }, [hasX, xProfileUrl]);

  // Initialize Facebook Page plugin
  useEffect(() => {
    if (!hasFacebook || !fbWrapRef.current) return;

    let mounted = true;
    let fbPageDiv: HTMLDivElement | null = null;

    async function initFacebook() {
      try {
        // Ensure fb-root exists
        if (typeof document !== 'undefined' && !document.getElementById('fb-root')) {
          const fbRoot = document.createElement('div');
          fbRoot.id = 'fb-root';
          document.body.prepend(fbRoot);
        }

        await loadScriptOnce('fb-sdk', 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0');
        
        if (!mounted || !fbWrapRef.current) return;
        
        // Safely clear existing content
        // Use innerHTML directly to avoid removeChild issues with third-party widgets
        const container = fbWrapRef.current;
        try {
          container.innerHTML = '';
        } catch (e) {
          // If innerHTML fails, try removeChild as fallback
          try {
            while (container.firstChild) {
              const child = container.firstChild;
              if (child.parentNode === container) {
                container.removeChild(child);
              } else {
                break; // Child was moved, stop trying
              }
            }
          } catch (e2) {
            // Ignore cleanup errors
          }
        }
        
        // Create Facebook page div
        fbPageDiv = document.createElement('div');
        fbPageDiv.className = 'fb-page';
        fbPageDiv.setAttribute('data-href', facebookUrl);
        fbPageDiv.setAttribute('data-tabs', 'timeline');
        fbPageDiv.setAttribute('data-hide-cover', 'false');
        fbPageDiv.setAttribute('data-show-facepile', 'false');
        fbPageDiv.setAttribute('data-width', '500');
        fbPageDiv.style.width = '100%';
        fbPageDiv.style.minHeight = '500px';
        container.appendChild(fbPageDiv);
        
        // Wait for FB to be available
        let attempts = 0;
        const checkFB = () => {
          if (window.FB?.XFBML && container) {
            try {
              window.FB.XFBML.parse(container);
              setFbLoaded(true);
            } catch (e) {
              console.warn('Failed to parse Facebook widget:', e);
            }
          } else if (attempts < 20 && mounted) {
            attempts++;
            setTimeout(checkFB, 100);
          }
        };
        checkFB();
      } catch (error) {
        console.warn('Failed to load Facebook SDK:', error);
      }
    }

    initFacebook();

    return () => {
      mounted = false;
      // Cleanup: safely remove content
      // Use innerHTML directly to avoid removeChild issues with third-party widgets
      if (fbWrapRef.current) {
        try {
          // Check if element still exists and is in the DOM
          if (fbWrapRef.current.parentNode) {
            fbWrapRef.current.innerHTML = '';
          }
        } catch (e) {
          // Silently ignore cleanup errors
        }
      }
    };
  }, [hasFacebook, facebookUrl]);


  if (!hasAny) {
    return (
      <div className="profile-section">
        <h2 className="profile-section-title">Social</h2>
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem'
        }}>
          <p style={{ margin: 0 }}>No social accounts available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-section">
      <h2 className="profile-section-title">Social</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginTop: '1rem'
      }}>
        {/* X (Twitter) Card */}
        {hasX && (
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>X (Twitter)</h3>
            </div>
            <div style={{
              height: '600px',
              overflow: 'auto',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} ref={xWrapRef}>
              {!xLoaded && (
                <p style={{ color: '#6b7280', margin: 0 }}>Loading timeline...</p>
              )}
            </div>
            <div style={{
              padding: '1rem',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <a
                href={xProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#000',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: 500,
                  fontSize: '0.875rem'
                }}
              >
                View on X →
              </a>
            </div>
          </div>
        )}

        {/* Facebook Card */}
        {hasFacebook && (
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Facebook</h3>
            </div>
            <div style={{
              height: '600px',
              overflow: 'auto',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} ref={fbWrapRef}>
              {!fbLoaded && (
                <p style={{ color: '#6b7280', margin: 0 }}>Loading page...</p>
              )}
            </div>
            <div style={{
              padding: '1rem',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#1877f2',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: 500,
                  fontSize: '0.875rem'
                }}
              >
                View on Facebook →
              </a>
            </div>
          </div>
        )}

        {/* YouTube Card */}
        {hasYouTube && (
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>YouTube</h3>
            </div>
            <div style={{
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: youtube.embedUrl ? '420px' : '200px'
            }}>
              {youtube.embedUrl ? (
                <iframe
                  src={youtube.embedUrl}
                  title="YouTube"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{
                    width: '100%',
                    maxWidth: '560px',
                    height: '315px',
                    borderRadius: '0.375rem'
                  }}
                />
              ) : (
                <p style={{
                  color: '#6b7280',
                  textAlign: 'center',
                  margin: 0,
                  padding: '2rem'
                }}>
                  Open channel on YouTube to view posts/videos.
                </p>
              )}
            </div>
            <div style={{
              padding: '1rem',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb'
            }}>
              <a
                href={youtube.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ff0000',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: 500,
                  fontSize: '0.875rem'
                }}
              >
                View on YouTube →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
