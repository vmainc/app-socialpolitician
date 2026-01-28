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
    
    // Suppress console errors from Facebook SDK
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = String(args[0] || '');
      const fullMessage = args.map(String).join(' ');
      
      // Suppress Facebook SDK errors (non-fatal, just noise)
      if (
        message.includes('ErrorUtils caught an error') ||
        fullMessage.includes('Could not find element') ||
        fullMessage.includes('DataStore.get: namespace is required') ||
        fullMessage.includes('[Caught in: Module') ||
        fullMessage.includes('Permissions policy violation: unload') ||
        fullMessage.includes('fburl.com/debugjs') ||
        fullMessage.includes('Subsequent non-fatal errors') ||
        (typeof args[0] === 'object' && args[0]?.hash) // Facebook error objects have hash property
      ) {
        return; // Suppress the error
      }
      // Call original console.error for other errors
      originalConsoleError.apply(console, args);
    };
    
    // Also suppress console.warn for Facebook violations
    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      const fullMessage = args.map(String).join(' ');
      if (
        fullMessage.includes('Permissions policy violation: unload') ||
        fullMessage.includes('Facebook')
      ) {
        return; // Suppress Facebook warnings
      }
      originalConsoleWarn.apply(console, args);
    };
    
    window.onerror = (message, source, lineno, colno, error) => {
      // Suppress removeChild errors from third-party widgets
      if (
        typeof message === 'string' && 
        (message.includes('removeChild') || message.includes('NotFoundError'))
      ) {
        return true; // Suppress the error
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

  // Initialize X timeline embed
  useEffect(() => {
    if (!hasX || !xWrapRef.current) return;

    let mounted = true;
    const container = xWrapRef.current;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function initX() {
      try {
        await loadScriptOnce('x-widgets', 'https://platform.twitter.com/widgets.js');
        
        if (!mounted || !container || !container.parentNode) return;
        
        // Clear container completely - React won't manage this content
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          if (!mounted || !container || !container.parentNode) return;
          
          try {
            container.innerHTML = '';
            
            // Create timeline anchor
            const anchorElement = document.createElement('a');
            anchorElement.className = 'twitter-timeline';
            anchorElement.href = xProfileUrl;
            anchorElement.setAttribute('data-height', '600');
            anchorElement.setAttribute('data-theme', 'light');
            anchorElement.setAttribute('data-chrome', 'noheader nofooter noborders');
            anchorElement.textContent = 'View posts';
            container.appendChild(anchorElement);
            
            // Wait for twttr to be ready, then load widget
            if (window.twttr?.ready) {
              // Use ready callback for proper initialization
              window.twttr.ready(() => {
                if (!mounted || !container || !container.parentNode) return;
                
                try {
                  // Load widgets in this container (will parse the anchor we just created)
                  if (window.twttr?.widgets) {
                    window.twttr.widgets.load(container);
                    setXLoaded(true);
                  }
                } catch (e) {
                  console.warn('Failed to load X widget:', e);
                  setXLoaded(true); // Set loaded anyway to hide loading message
                }
              });
            } else {
              // Fallback: poll for twttr to be available
              let attempts = 0;
              const checkTwttr = () => {
                if (!mounted || !container || !container.parentNode) return;
                
                if (window.twttr?.ready) {
                  window.twttr.ready(() => {
                    if (!mounted || !container || !container.parentNode) return;
                    try {
                      if (window.twttr?.widgets) {
                        window.twttr.widgets.load(container);
                        setXLoaded(true);
                      }
                    } catch (e) {
                      console.warn('Failed to load X widget:', e);
                      setXLoaded(true);
                    }
                  });
                } else if (attempts < 50 && mounted) {
                  attempts++;
                  timeoutId = setTimeout(checkTwttr, 100);
                } else if (attempts >= 50) {
                  console.warn('Twitter widgets.js failed to load after 5 seconds');
                  setXLoaded(true); // Set loaded anyway to hide loading message
                }
              };
              timeoutId = setTimeout(checkTwttr, 100);
            }
          } catch (error) {
            console.warn('Failed to initialize X widget:', error);
          }
        });
      } catch (error) {
        console.warn('Failed to load X widgets:', error);
      }
    }

    initX();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      // Don't try to clean up - let React handle it via key changes
      // Third-party widgets manipulate DOM in ways that conflict with manual cleanup
    };
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
