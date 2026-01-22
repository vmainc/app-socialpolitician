# 🔒 SSL Troubleshooting for app.socialpolitician.com

## Quick Fix Script

Run this on your VPS:

```bash
# Upload and run the fix script
cd /var/www/socialpolitician-app
# (or upload fix-ssl.sh from local machine)

chmod +x fix-ssl.sh
sudo ./fix-ssl.sh
```

## Manual Steps

### Step 1: Verify DNS

```bash
# Check DNS resolution
dig +short app.socialpolitician.com

# Should return: 69.169.103.23
# If not, wait for DNS propagation or fix DNS records
```

### Step 2: Check Nginx Config Exists

```bash
# Check if config file exists
ls -la /etc/nginx/sites-available/app.socialpolitician.com.conf

# If missing, create it:
sudo nano /etc/nginx/sites-available/app.socialpolitician.com.conf
# (Copy config from deploy/nginx/app.socialpolitician.com.conf)

# Enable it
sudo ln -sf /etc/nginx/sites-available/app.socialpolitician.com.conf /etc/nginx/sites-enabled/
```

### Step 3: Test Nginx Config

```bash
sudo nginx -t
```

**If errors:**
- Fix syntax errors shown
- Make sure all paths exist
- Check for typos

### Step 4: Make Sure Ports Are Open

```bash
# Check firewall
sudo ufw status

# Allow ports if needed
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### Step 5: Reload Nginx

```bash
sudo systemctl reload nginx
# or
sudo systemctl restart nginx
```

### Step 6: Test HTTP Works First

```bash
# Test HTTP (should work before SSL)
curl -I http://app.socialpolitician.com

# Should return 200 OK
```

**If HTTP doesn't work:**
- Check nginx is running: `sudo systemctl status nginx`
- Check config: `sudo nginx -t`
- Check logs: `sudo tail -f /var/log/nginx/error.log`

### Step 7: Install Certbot (if not installed)

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

### Step 8: Get SSL Certificate

```bash
sudo certbot --nginx -d app.socialpolitician.com
```

**If certbot fails with "Domain not pointing to this server":**
- Wait 5-60 minutes for DNS propagation
- Verify DNS: `dig +short app.socialpolitician.com`
- Make sure it returns your VPS IP

**If certbot fails with "Port 80 is not accessible":**
- Check firewall: `sudo ufw status`
- Allow port 80: `sudo ufw allow 80/tcp`
- Check nginx is listening: `sudo netstat -tlnp | grep :80`

**If certbot fails with "Nginx not found":**
- Install nginx: `sudo apt-get install -y nginx`
- Start nginx: `sudo systemctl start nginx`

### Step 9: Verify SSL

```bash
# Test HTTPS
curl -I https://app.socialpolitician.com

# Should return 200 OK with SSL
```

## Common Issues

### Issue: "Domain not pointing to this server"

**Solution:**
1. Check DNS: `dig +short app.socialpolitician.com`
2. Should return: `69.169.103.23`
3. If not, wait for DNS propagation or fix DNS records
4. Can take 5-60 minutes

### Issue: "Port 80 is not accessible"

**Solution:**
```bash
# Check firewall
sudo ufw status

# Allow ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check nginx is running
sudo systemctl status nginx
sudo systemctl start nginx
```

### Issue: "Nginx config has errors"

**Solution:**
```bash
# Test config
sudo nginx -t

# Fix errors shown
# Common issues:
# - Missing semicolons
# - Wrong paths
# - Syntax errors
```

### Issue: "Certificate exists but site still HTTP"

**Solution:**
```bash
# Check certificate
sudo certbot certificates

# Check nginx config has SSL block
sudo grep -A 10 "server_name app.socialpolitician.com" /etc/nginx/sites-available/app.socialpolitician.com.conf

# Should see:
# listen 443 ssl http2;
# ssl_certificate /etc/letsencrypt/live/app.socialpolitician.com/fullchain.pem;

# Reload nginx
sudo systemctl reload nginx
```

## Verify Everything Works

```bash
# 1. DNS
dig +short app.socialpolitician.com
# Should return: 69.169.103.23

# 2. HTTP
curl -I http://app.socialpolitician.com
# Should return: 200 OK

# 3. HTTPS
curl -I https://app.socialpolitician.com
# Should return: 200 OK

# 4. Certificate
sudo certbot certificates
# Should show app.socialpolitician.com certificate
```

## After SSL Works

- ✅ `https://app.socialpolitician.com` loads
- ✅ Browser shows padlock icon 🔒
- ✅ HTTP redirects to HTTPS automatically
- ✅ No SSL warnings
