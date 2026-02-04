#!/usr/bin/env node
/**
 * Standalone news proxy for production.
 * Serves GET /api/news?q=... by fetching Google News RSS server-side (no CORS).
 *
 * Run: node server/news-proxy.mjs
 * Port: NEWS_PROXY_PORT=3002 (default 3002)
 *
 * Nginx: proxy_pass /api/news to http://127.0.0.1:3002
 * Or run as the main API and proxy /api to this server.
 */

import http from 'http';
import https from 'https';

const PORT = parseInt(process.env.NEWS_PROXY_PORT || '3002', 10);
const RSS_BASE = 'https://news.google.com/rss/search?q=';

function fetchRss(q, callback) {
  const rssUrl = `${RSS_BASE}${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  const req = https.get(
    rssUrl,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsProxy/1.0)',
      },
    },
    (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks), res.headers['content-type']));
    }
  );
  req.on('error', (err) => callback(err));
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' || !req.url?.startsWith('/api/news')) {
    res.writeHead(404);
    res.end();
    return;
  }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const q = url.searchParams.get('q');
  if (!q) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing q');
    return;
  }
  fetchRss(q, (err, body, contentType) => {
    if (err) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('News proxy error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType || 'application/rss+xml',
      'Cache-Control': 'public, max-age=300',
    });
    res.end(body);
  });
});

server.listen(PORT, () => {
  console.log(`News proxy listening on http://127.0.0.1:${PORT}/api/news?q=...`);
});
