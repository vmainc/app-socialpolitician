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
// CORS proxy: corsproxy.io works when allorigins.win is blocked or fails
const CORS_PROXY = 'https://corsproxy.io/?url=';
const RSS_BASE =
  'https://news.google.com/rss/search?q=';

function buildSearchQuery(name: string): string {
  return `${name} "politician" OR "politics" OR "government"`;
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

function parseRssXml(xmlText: string): NewsItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const items = doc.querySelectorAll('channel > item');
  const seen = new Set<string>();
  const result: NewsItem[] = [];

  for (let i = 0; i < items.length && result.length < LIMIT; i++) {
    const item = items[i];
    const titleEl = item.querySelector('title');
    const linkEl = item.querySelector('link');
    const pubDateEl = item.querySelector('pubDate');
    const sourceEl = item.querySelector('source');

    const title = getTextContent(titleEl);
    const link = getTextContent(linkEl);
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
    if (seen.has(source)) continue;
    seen.add(source);

    result.push({
      title,
      link,
      pubDate: formatPubDate(pubDateRaw),
      source,
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

  useEffect(() => {
    if (!name?.trim()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const query = buildSearchQuery(name.trim());
    const encodedQuery = encodeURIComponent(query);
    const rssUrl = `${RSS_BASE}${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;
    const url = `${CORS_PROXY}${encodeURIComponent(rssUrl)}`;

    fetch(url, { mode: 'cors' })
      .then((res) => {
        if (!res.ok) throw new Error(`News feed failed: ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        const list = parseRssXml(text).slice(0, limit);
        setItems(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Could not load news.');
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [name, limit]);

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
