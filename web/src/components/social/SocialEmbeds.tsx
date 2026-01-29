/**
 * Social Embeds Component
 * Displays X (Twitter), Facebook, and YouTube embeds for politicians
 * SSR-safe and defensive against missing/invalid URLs
 */

import { useEffect, useRef, useState, Component, ErrorInfo, ReactNode } from 'react';
import { loadScriptOnce } from '../../utils/useThirdPartyScripts';

// Error Boundary to catch React reconciliation errors from third-party widgets
class WidgetErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Suppress removeChild errors - these are expected with third-party widgets
    if (error.message?.includes('removeChild') || error.name === 'NotFoundError') {
      return { hasError: false };
    }
    // For other errors, show error state
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log if it's not a removeChild error (which is expected with third-party widgets)
    if (!error.message?.includes('removeChild') && error.name !== 'NotFoundError') {
      console.warn('Widget error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // For non-removeChild errors, show fallback
      return <div style={{ padding: '1rem', color: '#6b7280' }}>Widget failed to load</div>;
    }
    return this.props.children;
  }
}

interface SocialEmbedsProps {
  politician: Record<string, any>;
}

// Extend Window interface for third-party scripts
declare global {
  interface Window {
    twttr?: {
      ready?: (callback: () => void) => void;
      widgets?: {
        load: (element?: HTMLElement | null) => void;
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
 * Returns object with channelUrl, optional embedUrl (for videos), and channelId/username for feed
 */
function parseYouTube(url: string): { 
  channelUrl: string; 
  embedUrl?: string;
  channelId?: string;
  username?: string;
} {
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
    
    // Extract channel ID or username from channel URL
    const path = urlObj.pathname.trim().replace(/^\/+|\/+$/g, '');
    
    // Handle different YouTube URL formats
    if (path.startsWith('channel/')) {
      const channelId = path.split('/')[1];
      return { 
        channelUrl: safeUrl,
        channelId: channelId
      };
    } else if (path.startsWith('c/')) {
      const username = path.split('/')[1];
      return { 
        channelUrl: safeUrl,
        username: username
      };
    } else if (path.startsWith('user/')) {
      const username = path.split('/')[1];
      return { 
        channelUrl: safeUrl,
        username: username
      };
    } else if (path.startsWith('@')) {
      const username = path.split('/')[0].replace('@', '');
      return { 
        channelUrl: safeUrl,
        username: username
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
  const [xKey, setXKey] = useState(0);
  const [fbKey, setFbKey] = useState(0);

  // Parse URLs
  const xProfileUrl = parseXProfileUrl(politician?.x_url);
  const facebookUrl = parseFacebookPageUrl(politician?.facebook_url);
  const youtube = parseYouTube(politician?.youtube_url);

  // Booleans
  const hasX = xProfileUrl !== '';
  const hasFacebook = facebookUrl !== '';
  const hasYouTube = youtube.channelUrl !== '';
  const hasAny = hasX || hasFacebook || hasYouTube;

  // Reset keys when URLs change to force remount
  useEffect(() => {
    if (hasX) setXKey(prev => prev + 1);
  }, [xProfileUrl, hasX]);

  useEffect(() => {
    if (hasFacebook) setFbKey(prev => prev + 1);
  }, [facebookUrl, hasFacebook]);

  // Suppress errors from third-party widgets
  useEffect(() => {
    const originalError = window.onerror;
    const originalUnhandledRejection = window.onunhandledrejection;
    
    // Helper to check if a message is a Facebook SDK error
    const isFacebookError = (args: any[]): boolean => {
      const fullMessage = args.map(String).join(' ');
      
      // Check for Facebook error patterns
      const facebookPatterns = [
        'ErrorUtils caught an error',
        'Could not find element',
        'DataStore.get: namespace is required',
        '[Caught in: Module',
        'Permissions policy violation: unload',
        'fburl.com/debugjs',
        'Subsequent non-fatal errors',
        'Requiring module',
        '__elem_',
        '__inst_',
        'u_1_', // Facebook element IDs pattern
      ];
      
      // Check if any pattern matches
      if (facebookPatterns.some(pattern => fullMessage.includes(pattern))) {
        return true;
      }
      
      // Check for Facebook error objects (have hash property)
      if (typeof args[0] === 'object' && args[0]?.hash) {
        return true;
      }
      
      // Check if source file is from Facebook
      if (args.length > 1 && typeof args[1] === 'string') {
        const source = args[1];
        if (
          source.includes('facebook.com') ||
          source.includes('fbcdn.net') ||
          source.includes('fburl.com') ||
          source.includes('connect.facebook.net')
        ) {
          return true;
        }
      }
      
      return false;
    };
    
    // Suppress console.errors from Facebook SDK
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      if (isFacebookError(args)) {
        return; // Suppress Facebook SDK errors
      }
      // Call original console.error for other errors
      originalConsoleError.apply(console, args);
    };
    
    // Also suppress console.warn for Facebook violations
    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      if (isFacebookError(args)) {
        return; // Suppress Facebook warnings
      }
      originalConsoleWarn.apply(console, args);
    };
    
    window.onerror = (message, source, lineno, colno, error) => {
      const messageStr = String(message || '');
      const sourceStr = String(source || '');
      
      // Suppress removeChild errors from third-party widgets
      if (
        messageStr.includes('removeChild') || 
        messageStr.includes('NotFoundError')
      ) {
        return true; // Suppress the error
      }
      
      // Suppress Facebook SDK errors
      if (
        sourceStr.includes('facebook.com') ||
        sourceStr.includes('fbcdn.net') ||
        sourceStr.includes('fburl.com') ||
        sourceStr.includes('connect.facebook.net') ||
        messageStr.includes('ErrorUtils') ||
        messageStr.includes('Permissions policy violation')
      ) {
        return true; // Suppress Facebook errors
      }
      
      // Call original handler for other errors
      if (originalError) {
        return originalError(message, source, lineno, colno, error);
      }
      return false;
    };

    return () => {
      window.onerror = originalError;
      window.onunhandledrejection = originalUnhandledRejection;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  // X (Twitter) - Show link card immediately; timeline embeds are no longer supported by X
  useEffect(() => {
    if (!hasX || !xWrapRef.current) return;

    const container = xWrapRef.current;
    const urlMatch = xProfileUrl.match(/(?:x\.com|twitter\.com)\/([^\/\?]+)/);
    const username = urlMatch ? urlMatch[1] : '';

    container.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #6b7280; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 400px;">
        <div style="margin-bottom: 1.5rem;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="color: #000;">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>
        <p style="margin-bottom: 1rem; font-size: 1.125rem; color: #374151;">
          View ${username ? `@${username}` : 'profile'} on X
        </p>
        <p style="margin-bottom: 1.5rem; color: #6b7280; max-width: 400px;">
          X no longer supports timeline embeds. Click below to see the latest posts.
        </p>
        <a href="${xProfileUrl}" target="_blank" rel="noopener noreferrer" 
           style="display: inline-block; padding: 0.75rem 1.5rem; background: #000; color: #fff; 
                  text-decoration: none; border-radius: 0.5rem; font-weight: 600; font-size: 1rem;">
          View on X →
        </a>
      </div>
    `;
    setXLoaded(true);
  }, [hasX, xProfileUrl, xKey]);

  // Initialize Facebook Page plugin
  useEffect(() => {
    if (!hasFacebook || !fbWrapRef.current) return;

    let mounted = true;
    const container = fbWrapRef.current;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function initFacebook() {
      try {
        // Ensure fb-root exists
        if (typeof document !== 'undefined' && !document.getElementById('fb-root')) {
          const fbRoot = document.createElement('div');
          fbRoot.id = 'fb-root';
          document.body.prepend(fbRoot);
        }

        await loadScriptOnce('fb-sdk', 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0');
        
        if (!mounted || !container || !container.parentNode) return;
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          if (!mounted || !container || !container.parentNode) return;
          
          try {
            // Clear container completely - React won't manage this content
            container.innerHTML = '';
            
            // Create Facebook page div
            const fbPageDiv = document.createElement('div');
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
              if (!mounted || !container || !container.parentNode) return;
              
              if (window.FB?.XFBML && container) {
                try {
                  window.FB.XFBML.parse(container);
                  setFbLoaded(true);
                } catch (e) {
                  console.warn('Failed to parse Facebook widget:', e);
                }
              } else if (attempts < 20 && mounted) {
                attempts++;
                timeoutId = setTimeout(checkFB, 100);
              }
            };
            checkFB();
          } catch (error) {
            console.warn('Failed to initialize Facebook widget:', error);
          }
        });
      } catch (error) {
        console.warn('Failed to load Facebook SDK:', error);
      }
    }

    initFacebook();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      // Don't try to clean up - let React handle it via key changes
      // Third-party widgets manipulate DOM in ways that conflict with manual cleanup
    };
  }, [hasFacebook, facebookUrl, fbKey]);


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
            <WidgetErrorBoundary>
              <div 
                key={`x-widget-${xKey}-${xProfileUrl}`}
                style={{
                  height: '600px',
                  overflow: 'auto',
                  padding: '1rem',
                  position: 'relative'
                }}
              >
                {!xLoaded && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    color: '#6b7280',
                    zIndex: 1
                  }}>
                    Loading timeline...
                  </div>
                )}
                <div 
                  ref={xWrapRef}
                  suppressHydrationWarning
                  style={{ width: '100%', height: '100%', minHeight: '500px' }}
                />
              </div>
            </WidgetErrorBoundary>
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
            <WidgetErrorBoundary>
              <div 
                key={`fb-widget-${fbKey}-${facebookUrl}`}
                style={{
                  height: '600px',
                  overflow: 'auto',
                  padding: '1rem',
                  position: 'relative'
                }}
              >
                {!fbLoaded && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    color: '#6b7280',
                    zIndex: 1
                  }}>
                    Loading page...
                  </div>
                )}
                <div 
                  ref={fbWrapRef}
                  suppressHydrationWarning
                  style={{ width: '100%', height: '100%', minHeight: '500px' }}
                />
              </div>
            </WidgetErrorBoundary>
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
              minHeight: youtube.embedUrl ? '420px' : '500px'
            }}>
              {youtube.embedUrl ? (
                // Video or playlist embed
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
              ) : youtube.channelId ? (
                // Embed channel's uploads playlist: UC... -> UU... (YouTube convention)
                (() => {
                  const id = youtube.channelId;
                  const uploadsPlaylistId = id.startsWith('UC') ? 'UU' + id.slice(2) : id;
                  const playlistEmbedUrl = `https://www.youtube.com/embed/videoseries?list=${uploadsPlaylistId}`;
                  return (
                    <iframe
                      src={playlistEmbedUrl}
                      title="YouTube Channel"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      style={{
                        width: '100%',
                        maxWidth: '560px',
                        height: '600px',
                        borderRadius: '0.375rem',
                        border: 'none'
                      }}
                    />
                  );
                })()
              ) : (
                // Fallback: Show channel link with preview
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#6b7280',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: '400px'
                }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="#FF0000" style={{ marginBottom: '1rem' }}>
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <p style={{ marginBottom: '0.5rem', fontSize: '1.125rem', color: '#374151', fontWeight: 600 }}>
                    YouTube Channel
                  </p>
                  <p style={{ marginBottom: '1.5rem', color: '#6b7280', maxWidth: '400px' }}>
                    View the channel on YouTube to see all videos and posts.
                  </p>
                  <a
                    href={youtube.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#FF0000',
                      color: '#fff',
                      textDecoration: 'none',
                      borderRadius: '0.5rem',
                      fontWeight: 600,
                      fontSize: '1rem',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    View on YouTube →
                  </a>
                </div>
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
