/**
 * Social Embeds Component
 * Displays Facebook and YouTube embeds for politicians (X/Twitter removed – no embed support).
 * SSR-safe and defensive against missing/invalid URLs.
 */

import { useEffect, useRef, useState, Component, ErrorInfo, ReactNode } from 'react';
import { loadScriptOnce } from '../../utils/useThirdPartyScripts';
import { installThirdPartyConsoleSuppression } from '../../utils/suppressThirdPartyConsole';

installThirdPartyConsoleSuppression();

// Error Boundary to catch React reconciliation errors from third-party widgets
class WidgetErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    if (error.message?.includes('removeChild') || error.name === 'NotFoundError') {
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!error.message?.includes('removeChild') && error.name !== 'NotFoundError') {
      console.warn('Widget error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ padding: '1rem', color: '#6b7280' }}>Widget failed to load</div>;
    }
    return this.props.children;
  }
}

interface SocialEmbedsProps {
  politician: Record<string, any>;
  hideTitle?: boolean;
}

declare global {
  interface Window {
    FB?: {
      init: (opts: { appId?: string; version: string; xfbml?: boolean }) => void;
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
 * Parse Facebook page URL – returns normalized safe URL or empty string
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

const FB_SDK_VERSION = 'v18.0';

export default function SocialEmbeds({ politician, hideTitle = false }: SocialEmbedsProps) {
  const fbWrapRef = useRef<HTMLDivElement>(null);
  const [fbLoaded, setFbLoaded] = useState(false);
  const [fbKey, setFbKey] = useState(0);

  const facebookUrl = parseFacebookPageUrl(politician?.facebook_url);
  const youtube = parseYouTube(politician?.youtube_url);

  const hasFacebook = facebookUrl !== '';
  const hasYouTube = youtube.channelUrl !== '';
  const hasAny = hasFacebook || hasYouTube;

  useEffect(() => {
    if (hasFacebook) setFbKey(prev => prev + 1);
  }, [facebookUrl, hasFacebook]);

  // Facebook Page plugin: load SDK, call FB.init(version), then XFBML.parse
  useEffect(() => {
    if (!hasFacebook || !fbWrapRef.current) return;

    let mounted = true;
    const container = fbWrapRef.current;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function initFacebook() {
      try {
        if (typeof document !== 'undefined' && !document.getElementById('fb-root')) {
          const fbRoot = document.createElement('div');
          fbRoot.id = 'fb-root';
          document.body.prepend(fbRoot);
        }

        // Load SDK with version in URL so SDK knows version; then init before parse
        await loadScriptOnce('fb-sdk', `https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=${FB_SDK_VERSION}`);
        if (!mounted || !container?.parentNode) return;

        requestAnimationFrame(() => {
          if (!mounted || !container?.parentNode) return;
          if (!window.FB) {
            console.warn('Facebook SDK did not load');
            return;
          }
          try {
            // Required: init with valid version before XFBML.parse (fixes "init not called with valid version")
            window.FB.init({ version: FB_SDK_VERSION, xfbml: true });
          } catch (_) {
            // init may throw if already called
          }

          container.innerHTML = '';
          const fbPageDiv = document.createElement('div');
          fbPageDiv.className = 'fb-page';
          fbPageDiv.setAttribute('data-href', facebookUrl);
          fbPageDiv.setAttribute('data-tabs', 'timeline');
          fbPageDiv.setAttribute('data-hide-cover', 'false');
          fbPageDiv.setAttribute('data-show-facepile', 'false');
          const fbWidth = typeof window !== 'undefined' ? Math.min(500, Math.max(280, (window.innerWidth || 320) - 48)) : 500;
          fbPageDiv.setAttribute('data-width', String(fbWidth));
          fbPageDiv.style.width = '100%';
          fbPageDiv.style.minHeight = '400px';
          container.appendChild(fbPageDiv);

          let attempts = 0;
          const checkFB = () => {
            if (!mounted || !container?.parentNode) return;
            if (window.FB?.XFBML && container) {
              try {
                window.FB.XFBML.parse(container);
                setFbLoaded(true);
              } catch (e) {
                console.warn('Failed to parse Facebook widget:', e);
              }
            } else if (attempts < 30 && mounted) {
              attempts++;
              timeoutId = setTimeout(checkFB, 150);
            }
          };
          checkFB();
        });
      } catch (error) {
        console.warn('Failed to load Facebook SDK:', error);
      }
    }

    initFacebook();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [hasFacebook, facebookUrl, fbKey]);


  if (!hasAny) {
    const emptyContent = (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        borderRadius: '0.5rem'
      }}>
        <p style={{ margin: 0 }}>No social accounts available.</p>
      </div>
    );
    return hideTitle ? emptyContent : (
      <div className="profile-section">
        <h2 className="profile-section-title">Social</h2>
        {emptyContent}
      </div>
    );
  }

  const gridContent = (
    <div className="social-embeds-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginTop: '1rem'
      }}>
        {/* Facebook Card */}
        {hasFacebook && (
          <div className="social-embed-card social-embed-fb" style={{
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
                className="social-embed-widget-wrap"
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
                  className="social-embed-fb-inner"
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
          <div className="social-embed-card social-embed-yt" style={{
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
            <WidgetErrorBoundary>
              <div
                className="social-embed-widget-wrap social-embed-yt-wrap"
                style={{
                  height: '600px',
                  overflow: 'auto',
                  padding: '1rem',
                  position: 'relative'
                }}
              >
                {youtube.embedUrl ? (
                  <div className="social-embed-yt-video-wrap" style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    width: '100%',
                    height: '100%',
                    minHeight: '500px'
                  }}>
                    <iframe
                      src={youtube.embedUrl}
                      title="YouTube"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="social-embed-yt-iframe"
                      style={{
                        width: '100%',
                        maxWidth: '560px',
                        height: '315px',
                        borderRadius: '0.375rem',
                        flexShrink: 0
                      }}
                    />
                  </div>
                ) : youtube.channelId ? (
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
                        className="social-embed-yt-iframe social-embed-yt-playlist"
                        style={{
                          width: '100%',
                          height: '568px',
                          borderRadius: '0.375rem',
                          border: 'none',
                          display: 'block'
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
            </WidgetErrorBoundary>
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
  );

  return hideTitle ? gridContent : (
    <div className="profile-section">
      <h2 className="profile-section-title">Social</h2>
      {gridContent}
    </div>
  );
}
