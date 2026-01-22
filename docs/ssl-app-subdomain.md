# SSL Setup for app.socialpolitician.com

This document describes how SSL (HTTPS) is configured for `app.socialpolitician.com`, matching the setup used for `presidents.socialpolitician.com`.

## Overview

- **Domain**: `app.socialpolitician.com`
- **VPS IP**: `69.169.103.23` (same as `presidents.socialpolitician.com`)
- **SSL Provider**: Let's Encrypt (via certbot)
- **Web Server**: Nginx 1.24.0 (Ubuntu)
- **Certificate Location**: `/etc/letsencrypt/live/app.socialpolitician.com/`
- **Nginx Config**: `/etc/nginx/sites-available/app.socialpolitician.com.conf`

## DNS Prerequisites

Before setting up SSL, ensure DNS is configured:

```bash
# Verify DNS points to VPS
dig +short app.socialpolitician.com
# Should return: 69.169.103.23

# Compare with presidents (should be same IP)
dig +short presidents.socialpolitician.com
# Should return: 69.169.103.23
```

**DNS Configuration:**
- Type: A Record
- Name: `app`
- Value: `69.169.103.23`
- TTL: 3600 (or default)

## Nginx Configuration Location

The nginx configuration file is located at:
```
/etc/nginx/sites-available/app.socialpolitician.com.conf
```

It's symlinked to:
```
/etc/nginx/sites-enabled/app.socialpolitician.com.conf
```

### Configuration Structure

The config includes two server blocks:

1. **HTTP Server Block (Port 80)**
   - Redirects all traffic to HTTPS (301 redirect)
   - Handles Let's Encrypt ACME challenges at `/.well-known/acme-challenge/`

2. **HTTPS Server Block (Port 443)**
   - Serves the application with SSL
   - Uses HTTP/2
   - Includes security headers
   - Proxies `/pb/` to PocketBase (port 8091)
   - Proxies `/api/` to Node.js API (port 3001)

### SSL Certificate Paths

- **Full Chain**: `/etc/letsencrypt/live/app.socialpolitician.com/fullchain.pem`
- **Private Key**: `/etc/letsencrypt/live/app.socialpolitician.com/privkey.pem`
- **Certificate**: `/etc/letsencrypt/live/app.socialpolitician.com/cert.pem`
- **Chain**: `/etc/letsencrypt/live/app.socialpolitician.com/chain.pem`

## Initial SSL Setup

### Automated Setup (Recommended)

Run the setup script on the VPS:

```bash
cd /var/www/socialpolitician-app
sudo bash scripts/setup_ssl_app.sh
```

This script will:
1. Verify DNS configuration
2. Inspect the working `presidents.socialpolitician.com` config as reference
3. Create/update nginx config for `app.socialpolitician.com`
4. Enable the config
5. Test nginx configuration
6. Install certbot if needed
7. Obtain SSL certificate from Let's Encrypt
8. Configure nginx with SSL settings
9. Validate the setup

### Manual Setup

If you prefer to set up manually:

1. **Create nginx config** (if it doesn't exist):
   ```bash
   sudo nano /etc/nginx/sites-available/app.socialpolitician.com.conf
   ```

2. **Enable the config**:
   ```bash
   sudo ln -sf /etc/nginx/sites-available/app.socialpolitician.com.conf /etc/nginx/sites-enabled/
   ```

3. **Test nginx config**:
   ```bash
   sudo nginx -t
   ```

4. **Reload nginx**:
   ```bash
   sudo systemctl reload nginx
   ```

5. **Install certbot** (if not installed):
   ```bash
   sudo apt-get update
   sudo apt-get install -y certbot python3-certbot-nginx
   ```

6. **Obtain SSL certificate**:
   ```bash
   sudo certbot --nginx -d app.socialpolitician.com
   ```

   Certbot will:
   - Automatically obtain the certificate
   - Update nginx config with SSL settings
   - Set up auto-renewal

## Certificate Renewal

Let's Encrypt certificates expire every 90 days. Certbot automatically renews them.

### Check Renewal Status

```bash
# Check certbot timer status
sudo systemctl status certbot.timer

# Check when certificate expires
sudo certbot certificates

# Test renewal (dry run)
sudo certbot renew --dry-run
```

### Manual Renewal

If needed, renew manually:

```bash
# Renew all certificates
sudo certbot renew

# Renew specific certificate
sudo certbot renew --cert-name app.socialpolitician.com

# Force renewal (even if not expired)
sudo certbot renew --cert-name app.socialpolitician.com --force-renewal
```

After renewal, reload nginx:

```bash
sudo systemctl reload nginx
```

## Adding Another Subdomain

To add SSL for a new subdomain (e.g., `newapp.socialpolitician.com`):

1. **Set up DNS**: Create A record pointing to `69.169.103.23`

2. **Create nginx config**: Copy the pattern from `app.socialpolitician.com.conf`:
   ```bash
   sudo cp /etc/nginx/sites-available/app.socialpolitician.com.conf \
          /etc/nginx/sites-available/newapp.socialpolitician.com.conf
   ```

3. **Update config**: Replace `app.socialpolitician.com` with `newapp.socialpolitician.com`:
   ```bash
   sudo sed -i 's/app\.socialpolitician\.com/newapp.socialpolitician.com/g' \
       /etc/nginx/sites-available/newapp.socialpolitician.com.conf
   ```

4. **Update paths**: Adjust root directory and ports as needed

5. **Enable config**:
   ```bash
   sudo ln -sf /etc/nginx/sites-available/newapp.socialpolitician.com.conf \
              /etc/nginx/sites-enabled/
   ```

6. **Test and reload**:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

7. **Get SSL certificate**:
   ```bash
   sudo certbot --nginx -d newapp.socialpolitician.com
   ```

## Validation

### Quick Validation

```bash
# HTTP should redirect to HTTPS
curl -I http://app.socialpolitician.com
# Should return: 301 Moved Permanently

# HTTPS should work
curl -I https://app.socialpolitician.com
# Should return: HTTP/2 200

# Certificate should be valid
echo | openssl s_client -connect app.socialpolitician.com:443 -servername app.socialpolitician.com 2>/dev/null | grep "Verify return code"
# Should return: Verify return code: 0 (ok)
```

### Comprehensive Validation Script

Run the validation script:

```bash
cd /var/www/socialpolitician-app
bash scripts/validate_ssl.sh
```

## Troubleshooting

### Certificate Not Found

If certbot says certificate doesn't exist:
```bash
# Check if certificate files exist
sudo ls -la /etc/letsencrypt/live/app.socialpolitician.com/

# If missing, obtain certificate
sudo certbot --nginx -d app.socialpolitician.com
```

### DNS Not Propagated

If certbot fails with "Domain not pointing to this server":
```bash
# Verify DNS
dig +short app.socialpolitician.com

# Wait 5-60 minutes for DNS propagation
# Then retry certbot
```

### Port 80 Blocked

If certbot fails with "Port 80 is not accessible":
```bash
# Check firewall
sudo ufw status

# Allow ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check nginx is listening
sudo netstat -tlnp | grep :80
```

### Nginx Config Errors

If nginx test fails:
```bash
# Test config
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### Certificate Expired

If certificate is expired:
```bash
# Renew certificate
sudo certbot renew --cert-name app.socialpolitician.com --force-renewal

# Reload nginx
sudo systemctl reload nginx
```

### Mixed Content Warnings

Ensure all resources (CSS, JS, images) are loaded over HTTPS:
- Check browser console for mixed content errors
- Update any hardcoded `http://` URLs to `https://` or use protocol-relative URLs

## Comparison with presidents.socialpolitician.com

Both domains use identical SSL setup:

| Aspect | presidents.socialpolitician.com | app.socialpolitician.com |
|--------|-------------------------------|--------------------------|
| SSL Provider | Let's Encrypt | Let's Encrypt |
| Certificate Tool | certbot | certbot |
| Nginx Config | `/etc/nginx/sites-available/presidents.socialpolitician.com.conf` | `/etc/nginx/sites-available/app.socialpolitician.com.conf` |
| Certificate Path | `/etc/letsencrypt/live/presidents.socialpolitician.com/` | `/etc/letsencrypt/live/app.socialpolitician.com/` |
| HTTP Redirect | ✅ 301 to HTTPS | ✅ 301 to HTTPS |
| HTTP/2 | ✅ Enabled | ✅ Enabled |
| Security Headers | ✅ Included | ✅ Included |

## Security Best Practices

1. **Auto-renewal**: Certbot timer is enabled by default
2. **Security headers**: HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
3. **TLS settings**: Uses Let's Encrypt recommended TLS configuration
4. **HTTP/2**: Enabled for better performance
5. **Port 80 redirect**: All HTTP traffic redirected to HTTPS

## References

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://eff-certbot.readthedocs.io/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
