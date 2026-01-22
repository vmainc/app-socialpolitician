# Quick SSL Setup Guide

## One-Command Setup

SSH into your VPS and run:

```bash
ssh doug@69.169.103.23
cd /var/www/socialpolitician-app
sudo bash scripts/run_ssl_setup.sh
```

This will:
1. ✅ Discover current SSL configuration
2. ✅ Set up SSL to match presidents.socialpolitician.com
3. ✅ Validate the setup

## What the Script Does

The `run_ssl_setup.sh` script automatically:

1. **Discovery Phase**
   - Shows current nginx configs
   - Shows certificate status
   - Compares with presidents.socialpolitician.com

2. **Setup Phase**
   - Verifies DNS points to VPS (69.169.103.23)
   - Inspects presidents config as reference
   - Creates/updates app nginx config
   - Obtains/renews SSL certificate via certbot
   - Configures nginx with SSL settings
   - Reloads nginx

3. **Validation Phase**
   - Tests HTTP redirect (should be 301)
   - Tests HTTPS (should be 200)
   - Validates SSL certificate
   - Checks certificate chain
   - Compares with presidents domain

## Expected Output

You should see output like:

```
🔒 Complete SSL Setup for app.socialpolitician.com
==================================================

[Discovery output showing current state]

[Setup output showing configuration]

[Validation output confirming everything works]

✅ SSL Setup Complete and Validated!
🌐 Test in browser: https://app.socialpolitician.com
```

## Troubleshooting

If the script fails:

1. **DNS Issue**: Make sure `app.socialpolitician.com` points to `69.169.103.23`
   ```bash
   dig +short app.socialpolitician.com
   ```

2. **Firewall Issue**: Ensure ports 80 and 443 are open
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **Nginx Issue**: Check nginx status
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

4. **Certbot Issue**: Check if certbot is installed
   ```bash
   which certbot
   sudo apt-get install -y certbot python3-certbot-nginx
   ```

## Manual Steps (if needed)

If you prefer to run steps individually:

```bash
# 1. Discovery
sudo bash scripts/discover_ssl_setup.sh

# 2. Setup
sudo bash scripts/setup_ssl_app.sh

# 3. Validate
bash scripts/validate_ssl.sh
```

## After Setup

Once complete, verify in browser:
- ✅ https://app.socialpolitician.com loads
- ✅ Browser shows padlock icon 🔒
- ✅ No SSL warnings
- ✅ HTTP redirects to HTTPS automatically

## Files Created

The setup creates/updates:
- `/etc/nginx/sites-available/app.socialpolitician.com.conf`
- `/etc/letsencrypt/live/app.socialpolitician.com/` (certificate files)

## Notes

- Scripts are **idempotent** - safe to run multiple times
- Configs are **backed up** before modification
- Existing certificates are **reused** if valid
- All changes are **validated** before applying
