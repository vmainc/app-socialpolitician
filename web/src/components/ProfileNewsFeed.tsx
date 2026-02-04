/**
 * Profile News Feed – latest news for a politician (Google News RSS)
 * Ported from WordPress get_unique_news_for_post / ai_news_feed shortcode.
 */

import { useState, useEffect } from 'react';

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

const LIMIT = 5;
const RSS_BASE = 'https://news.google.com/rss/search?q=';

/** Same-origin news proxy (Vite dev or your API server in production) */
function getNewsProxyUrl(query: string): string {
  return `/api/news?q=${encodeURIComponent(query)}`;
}

// Fallback CORS proxies when same-origin /api/news is not available
function buildProxiedUrl(rssUrl: string): { url: string; parseJson?: boolean }[] {
  const encoded = encodeURIComponent(rssUrl);
  return [
    { url: `https://corsproxy.io/?url=${encoded}` },
    { url: `https://api.allorigins.win/raw?url=${encoded}` },
    { url: `https://api.allorigins.win/get?url=${encoded}`, parseJson: true },
  ];
}

function buildSearchQuery(name: string): string {
  return `${name} "politician" OR "politics" OR "government"`;
}

/** Simpler query – just the name – often more reliable with Google News RSS */
function buildSimpleQuery(name: string): string {
  return name.trim();
}

function formatPubDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getTextContent(el: Element | null): string {
  if (!el) return '';
  return (el.textContent || '').trim();
}

/** True if the response looks like HTML (proxy error/captcha) rather than RSS */
function looksLikeHtml(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('<!') || trimmed.startsWith('<html') || (trimmed.length > 0 && !trimmed.includes('<channel') && !trimmed.includes('<item') && !trimmed.includes('<entry'));
}

function parseRssXml(xmlText: string, options?: { allowDuplicateSources?: boolean }): NewsItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) return [];

  // RSS 2.0: channel > item, or just item (namespaced feeds)
  let itemEls = doc.querySelectorAll('channel > item');
  if (itemEls.length === 0) itemEls = doc.querySelectorAll('item');
  if (itemEls.length === 0) itemEls = doc.querySelectorAll('entry');
  const seen = new Set<string>();
  const result: NewsItem[] = [];
  const allowDupSources = options?.allowDuplicateSources ?? true;

  for (let i = 0; i < itemEls.length && result.length < LIMIT; i++) {
    const item = itemEls[i];
    const titleEl = item.querySelector('title');
    let linkEl: Element | null = item.querySelector('link');
    if (!linkEl || !getTextContent(linkEl)) {
      const atomLink = item.querySelector('link[href]');
      if (atomLink?.getAttribute('href')) linkEl = atomLink;
    }
    const pubDateEl = item.querySelector('pubDate') ?? item.querySelector('updated');
    const sourceEl = item.querySelector('source');

    const title = getTextContent(titleEl);
    const link = linkEl ? (linkEl.getAttribute?.('href') || getTextContent(linkEl)) : '';
    const pubDateRaw = getTextContent(pubDateEl);
    let source = getTextContent(sourceEl);
    if (!source && link) {
      try {
        source = new URL(link).hostname || link;
      } catch {
        source = link;
      }
    }

    if (!title || !link) continue;
    if (!allowDupSources && seen.has(source)) continue;
    seen.add(source);

    result.push({
      title,
      link,
      pubDate: formatPubDate(pubDateRaw),
      source: source || 'News',
    });
  }

  return result;
}

interface ProfileNewsFeedProps {
  /** Politician display name for the news search */
  name: string;
  /** Optional limit (default 5) */
  limit?: number;
  /** When true, omit section wrapper and title (e.g. when inside an accordion) */
  hideTitle?: boolean;
}

export default function ProfileNewsFeed({ name, limit = LIMIT, hideTitle = false }: ProfileNewsFeedProps) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!name?.trim()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fullQuery = buildSearchQuery(name.trim());
    const simpleQuery = buildSimpleQuery(name);
    const buildSources = (query: string) => {
      const rssUrl = `${RSS_BASE}${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      return [
        { url: getNewsProxyUrl(query), parseJson: false },
        ...buildProxiedUrl(rssUrl),
      ];
    };
    const proxySourcesFirst = buildSources(fullQuery);
    const proxySourcesFallback = buildSources(simpleQuery);

    async function trySources(sources: { url: string; parseJson?: boolean }[]): Promise<{ list: NewsItem[]; lastError: string | null }> {
      let lastError: string | null = null;
      for (const { url, parseJson } of sources) {
        if (cancelled) return { list: [], lastError };
        try {
          const res = await fetch(url, { mode: 'cors' });
          if (!res.ok) {
            lastError = `News feed failed: ${res.status}`;
            continue;
          }
          let text = await res.text();
          if (cancelled) return { list: [], lastError };
          if (parseJson) {
            try {
              const data = JSON.parse(text) as { contents?: string };
              text = data.contents ?? text;
            } catch {
              lastError = 'News feed returned invalid response.';
              continue;
            }
          }
          if (looksLikeHtml(text)) {
            lastError = 'News feed returned an error page.';
            continue;
          }
          const list = parseRssXml(text).slice(0, limit);
          if (list.length > 0) return { list, lastError: null };
          lastError = 'No relevant news found.';
        } catch (err) {
          lastError = (err as Error)?.message || 'Could not load news.';
        }
      }
      return { list: [], lastError };
    }

    async function fetchNews() {
      let { list, lastError } = await trySources(proxySourcesFirst);
      if (list.length === 0 && proxySourcesFallback.length > 0) {
        const fallback = await trySources(proxySourcesFallback);
        if (fallback.list.length > 0) {
          list = fallback.list;
          lastError = null;
        } else if (fallback.lastError) lastError = fallback.lastError;
      }
      if (!cancelled) {
        if (list.length > 0) {
          setItems(list);
          setError(null);
        } else {
          setError(lastError || 'Could not load news.');
          setItems([]);
        }
      }
    }

    fetchNews().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [name, limit, retryCount]);

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
  };

  if (loading) {
    const inner = (
      <>
        {!hideTitle && <h2 className="profile-section-title">Latest News</h2>}
        <p className="profile-news-loading">Loading news…</p>
      </>
    );
    return hideTitle ? <div className="profile-news-feed">{inner}</div> : (
      <div className="profile-section profile-news-feed">{inner}</div>
    );
  }

  if (error) {
    const inner = (
      <>
        {!hideTitle && <h2 className="profile-section-title">Latest News</h2>}
        <p className="profile-news-error">{error}</p>
        <p className="profile-news-retry">
          <button type="button" onClick={handleRetry} className="profile-news-retry-btn">
            Retry
          </button>
        </p>
      </>
    );
    return hideTitle ? <div className="profile-news-feed">{inner}</div> : (
      <div className="profile-section profile-news-feed">{inner}</div>
    );
  }

  if (items.length === 0) {
    const inner = (
      <>
        {!hideTitle && <h2 className="profile-section-title">Latest News</h2>}
        <p className="profile-news-empty">No relevant news found.</p>
      </>
    );
    return hideTitle ? <div className="profile-news-feed">{inner}</div> : (
      <div className="profile-section profile-news-feed">{inner}</div>
    );
  }

  const listInner = (
    <ul className="profile-news-list" aria-label="Latest news">
      {items.map((entry, i) => (
        <li key={`${entry.link}-${i}`} className="profile-news-item">
          <a
            href={entry.link}
            target="_blank"
            rel="noopener noreferrer"
            className="profile-news-link"
          >
            {entry.title}
          </a>
          <small className="profile-news-meta">
            {entry.source}, {entry.pubDate}
          </small>
        </li>
      ))}
    </ul>
  );
  return hideTitle ? (
    <div className="profile-news-feed">{listInner}</div>
  ) : (
    <div className="profile-section profile-news-feed">
      <h2 className="profile-section-title">Latest News</h2>
      {listInner}
    </div>
  );
}
