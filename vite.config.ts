import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Connect } from 'vite';
import https from 'https';

const RSS_BASE = 'https://news.google.com/rss/search?q=';

// Dev-only: handle /api/news server-side so the news feed works without CORS
function newsProxyMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url ?? '';
    if (req.method !== 'GET' || !url.startsWith('/api/news')) return next();
    const parsed = new URL(url, 'http://localhost');
    const q = parsed.searchParams.get('q');
    if (!q) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing q');
      return;
    }
    const rssUrl = `${RSS_BASE}${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
    const request = https.get(
      rssUrl,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsFeed/1.0)' } },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 200, {
          'Content-Type': proxyRes.headers['content-type'] || 'application/rss+xml',
        });
        proxyRes.pipe(res);
      }
    );
    request.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('News proxy error');
    });
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'news-proxy',
      configureServer(server) {
        server.middlewares.use(newsProxyMiddleware());
      },
    },
  ],
  root: 'web',
  server: {
    // Dev server proxy - browser still uses /api and /pb paths
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        bypass(req) {
          // Let /api/news go to our news-proxy middleware instead of 3001
          if (req.url?.startsWith('/api/news')) return req.url;
        },
      },
      '/pb': {
        target: 'http://127.0.0.1:8091',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});