# News Feed on Politician Profiles

The "Latest News" section on politician profiles loads Google News RSS. It works in three ways:

## Development

When you run `npm run dev`, the Vite dev server handles `/api/news` itself (server-side fetch to Google News). No extra setup.

## Production (recommended)

To avoid depending on third-party CORS proxies, run the standalone news proxy on your server and point nginx at it.

### 1. Get the file on the VPS

The proxy script is `server/news-proxy.mjs`. It must be on the VPS before you run it:

```bash
cd /var/www/socialpolitician-app
git pull origin main
```

(Or run your usual deploy script so the repo is up to date.)

### 2. Run the proxy

From the app directory on the VPS:

```bash
cd /var/www/socialpolitician-app
node server/news-proxy.mjs
```

Default port: `3002`. Override with `NEWS_PROXY_PORT=3002`.

**Quick test (runs until you close the terminal):**  
Leave that command running in one terminal, then in nginx add the `/api/news` location (step 3) and reload nginx. Open a politician profile and expand “Latest News” – it should load.

**Keep it running:** Use systemd (step 4) or run in the background:  
`nohup node server/news-proxy.mjs > /tmp/news-proxy.log 2>&1 &`

### 3. Configure nginx (edit a file, don’t paste into the terminal)

The nginx snippet below goes **inside your nginx config file**, not in the shell.

- Edit the site config, e.g. `sudo nano /etc/nginx/sites-available/app.socialpolitician.com` (or whatever file serves `app.socialpolitician.com`).
- Inside the `server { ... }` block, add a `location` for `/api/news` **before** any general `location /api` block:

```nginx
    location /api/news {
      proxy_pass http://127.0.0.1:3002;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }
```

- Save, then test and reload nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 4. (Optional) Run the proxy with systemd

So the proxy stays up and restarts on reboot, create a unit file:

```bash
sudo nano /etc/systemd/system/socialpolitician-news-proxy.service
```

Paste (adjust `WorkingDirectory` if your app lives elsewhere):

```ini
[Unit]
Description=News proxy for Social Politician
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/socialpolitician-app
ExecStart=/usr/bin/node server/news-proxy.mjs
Restart=on-failure
Environment=NEWS_PROXY_PORT=3002

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable socialpolitician-news-proxy.service
sudo systemctl start socialpolitician-news-proxy.service
```

## Production (fallback)

If you don’t run the news proxy, the frontend will try same-origin `/api/news` (which may 404), then try public CORS proxies (corsproxy.io, allorigins.win). Those can be rate-limited or blocked, so the feed may sometimes fail.
