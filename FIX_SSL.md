# Fix SSL for app.socialpolitician.com

## Current Status

- **HTTPS** works: valid Let's Encrypt cert for `app.socialpolitician.com` (verified via `curl` / `openssl`).
- **HTTP** redirects to HTTPS (301).
- If you still see **"Not Secure"** in the browser: the app may have been built with `VITE_PB_BASE=http://...` (mixed content). **Rebuild and redeploy**; production now always uses `/pb` and `/api` (same-origin).

## One-Command Fix on VPS

SSH in and run:

```bash
ssh doug@69.169.103.23 'cd /var/www/socialpolitician-app && sudo ./fix-ssl.sh'
```

Or from the app dir on the VPS:

```bash
sudo ./fix-ssl.sh
```

## Manual Fix

### Step 1: Verify DNS is Working

```bash
# Check DNS resolution
dig +short app.socialpolitician.com

# Should return: 69.169.103.23
```

### Step 2: Get SSL Certificate

SSH into your VPS and run:

```bash
sudo certbot --nginx -d app.socialpolitician.com
```

This will:
- Automatically get SSL certificate from Let's Encrypt
- Update nginx config with SSL settings
- Set up auto-renewal

### Step 3: Verify SSL

```bash
# Test SSL
curl -I https://app.socialpolitician.com

# Should return 200 OK with HTTPS
```

### Step 4: Check Nginx Config

The nginx config should have SSL settings like:

```nginx
server {
    listen 443 ssl http2;
    server_name app.socialpolitician.com;

    ssl_certificate /etc/letsencrypt/live/app.socialpolitician.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.socialpolitician.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # ... rest of config
}
```

## Troubleshooting

**If certbot fails:**

1. Make sure DNS is pointing to the VPS:
   ```bash
   dig +short app.socialpolitician.com
   ```

2. Make sure port 80 is open (for HTTP-01 challenge):
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. Make sure nginx is running:
   ```bash
   sudo systemctl status nginx
   ```

4. Check nginx config is valid:
   ```bash
   sudo nginx -t
   ```

**If certificate exists but site still shows HTTP:**

1. Check nginx config has SSL block:
   ```bash
   sudo grep -A 5 "server_name app.socialpolitician.com" /etc/nginx/sites-available/app.socialpolitician.com.conf
   ```

2. Reload nginx:
   ```bash
   sudo systemctl reload nginx
   ```

3. Check SSL certificate:
   ```bash
   sudo certbot certificates
   ```

## After SSL is Working

Verify:
- ✅ `https://app.socialpolitician.com` loads
- ✅ Browser shows padlock icon
- ✅ No SSL warnings
- ✅ HTTP redirects to HTTPS
