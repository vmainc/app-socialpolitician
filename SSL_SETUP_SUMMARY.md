# SSL Setup Summary for app.socialpolitician.com

## Discovery Results

### DNS Configuration ✅
- **app.socialpolitician.com**: `69.169.103.23`
- **presidents.socialpolitician.com**: `69.169.103.23`
- **VPS IP**: `69.169.103.23`
- **Status**: Both domains correctly point to the same VPS

### Current SSL Status

Based on remote testing:

#### presidents.socialpolitician.com (Reference - Working)
- ✅ HTTPS: HTTP/2 200 OK
- ✅ HTTP Redirect: 301 to HTTPS
- ✅ SSL Certificate: Valid (Let's Encrypt, expires Apr 17 2026)
- ✅ Certificate Chain: Complete
- ✅ Verify Return Code: 0 (ok)

#### app.socialpolitician.com (Current State)
- ✅ HTTPS: HTTP/2 200 OK
- ✅ HTTP Redirect: 301 to HTTPS
- ✅ SSL Certificate: Valid (Let's Encrypt, expires Apr 19 2026)
- ✅ Certificate Chain: Complete
- ✅ Verify Return Code: 0 (ok)

**Note**: SSL appears to be working, but configuration may not match presidents exactly.

### Server Stack
- **Web Server**: Nginx 1.24.0 (Ubuntu)
- **SSL Provider**: Let's Encrypt
- **Certificate Tool**: certbot
- **Hosting**: Single VPS at 69.169.103.23

### Expected Configuration Locations

Based on documentation and standard practices:

- **Presidents Config**: `/etc/nginx/sites-available/presidents.socialpolitician.com.conf`
- **App Config**: `/etc/nginx/sites-available/app.socialpolitician.com.conf`
- **Presidents Cert**: `/etc/letsencrypt/live/presidents.socialpolitician.com/`
- **App Cert**: `/etc/letsencrypt/live/app.socialpolitician.com/`

## Implementation Plan

### Step 1: Discovery (On VPS)

Run the discovery script to inspect current server configuration:

```bash
cd /var/www/socialpolitician-app
sudo bash scripts/discover_ssl_setup.sh
```

This will show:
- Current nginx configs for both domains
- Certificate status
- Configuration differences
- Any issues

### Step 2: Setup SSL (On VPS)

Run the automated setup script:

```bash
cd /var/www/socialpolitician-app
sudo bash scripts/setup_ssl_app.sh
```

This script will:
1. Verify DNS points to VPS
2. Inspect presidents config as reference
3. Create/update app nginx config to match presidents pattern
4. Enable the config
5. Test nginx configuration
6. Install certbot if needed
7. Obtain/renew SSL certificate
8. Configure nginx with SSL settings
9. Validate the setup

### Step 3: Validation

Run validation to confirm everything works:

```bash
cd /var/www/socialpolitician-app
bash scripts/validate_ssl.sh
```

Or test manually:

```bash
# HTTP redirect
curl -I http://app.socialpolitician.com
# Should return: 301 Moved Permanently

# HTTPS
curl -I https://app.socialpolitician.com
# Should return: HTTP/2 200

# Certificate validation
echo | openssl s_client -connect app.socialpolitician.com:443 -servername app.socialpolitician.com | grep "Verify return code"
# Should return: Verify return code: 0 (ok)
```

## Configuration Details

### Nginx Config Structure

The setup script creates a config matching presidents.socialpolitician.com:

**HTTP Server Block (Port 80)**
- Listens on port 80
- Handles ACME challenges for Let's Encrypt
- Redirects all other traffic to HTTPS (301)

**HTTPS Server Block (Port 443)**
- Listens on port 443 with SSL and HTTP/2
- Uses Let's Encrypt certificate
- Includes security headers (HSTS, X-Frame-Options, etc.)
- Serves frontend from `/var/www/socialpolitician-app/web/dist`
- Proxies `/pb/` to PocketBase (port 8091)
- Proxies `/api/` to Node.js API (port 3001)

### SSL Certificate Configuration

- **Provider**: Let's Encrypt
- **Method**: HTTP-01 challenge (via certbot)
- **Auto-renewal**: Enabled via certbot timer
- **Certificate Path**: `/etc/letsencrypt/live/app.socialpolitician.com/`
- **Full Chain**: `fullchain.pem`
- **Private Key**: `privkey.pem`

## Files Created

### Scripts
1. **`scripts/discover_ssl_setup.sh`** - Discovery script to inspect current setup
2. **`scripts/setup_ssl_app.sh`** - Automated SSL setup script
3. **`scripts/validate_ssl.sh`** - Validation script to test SSL setup

### Documentation
1. **`docs/ssl-app-subdomain.md`** - Comprehensive SSL setup documentation
2. **`SSL_SETUP_SUMMARY.md`** - This file

## Expected Output After Setup

### Nginx Config Test
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Certificate Status
```
Certificate Name: app.socialpolitician.com
  Domains: app.socialpolitician.com
  Expiry Date: YYYY-MM-DD HH:MM:SS+00:00 (VALID: XX days)
  Certificate Path: /etc/letsencrypt/live/app.socialpolitician.com/fullchain.pem
  Private Key Path: /etc/letsencrypt/live/app.socialpolitician.com/privkey.pem
```

### Validation Results
```
✅ DNS correctly points to VPS
✅ HTTP redirects to HTTPS
✅ HTTPS works
✅ SSL certificate is valid
✅ Certificate chain present
✅ Using modern TLS version
✅ All checks passed! SSL is properly configured.
```

## Troubleshooting

If setup fails, check:

1. **DNS**: `dig +short app.socialpolitician.com` should return `69.169.103.23`
2. **Firewall**: Ports 80 and 443 should be open
3. **Nginx**: Should be running and config should be valid
4. **Certbot**: Should be installed and accessible

See `docs/ssl-app-subdomain.md` for detailed troubleshooting steps.

## Next Steps

1. **SSH into VPS**: `ssh doug@69.169.103.23`
2. **Navigate to app directory**: `cd /var/www/socialpolitician-app`
3. **Run discovery** (optional): `sudo bash scripts/discover_ssl_setup.sh`
4. **Run setup**: `sudo bash scripts/setup_ssl_app.sh`
5. **Validate**: `bash scripts/validate_ssl.sh`
6. **Test in browser**: Visit `https://app.socialpolitician.com`

## Comparison with presidents.socialpolitician.com

After setup, both domains will have identical SSL configuration:

| Feature | presidents | app |
|---------|-----------|-----|
| SSL Provider | Let's Encrypt | Let's Encrypt |
| Certificate Tool | certbot | certbot |
| HTTP Redirect | ✅ 301 | ✅ 301 |
| HTTPS | ✅ HTTP/2 200 | ✅ HTTP/2 200 |
| Security Headers | ✅ Included | ✅ Included |
| Auto-renewal | ✅ Enabled | ✅ Enabled |

## Notes

- The setup script is idempotent - safe to run multiple times
- Configs are backed up before modification
- Script checks for existing certificates before creating new ones
- All changes are validated before applying
