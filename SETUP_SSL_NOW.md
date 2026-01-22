# 🔒 Setup SSL for app.socialpolitician.com

## Quick SSL Setup

### Step 1: SSH into VPS

```bash
ssh doug@69.169.103.23
# or
ssh doug@your-vps-hostname
```

### Step 2: Verify DNS is Working

```bash
dig +short app.socialpolitician.com
# Should return: 69.169.103.23
```

### Step 3: Make Sure Nginx Config Exists

```bash
# Check if config file exists
ls -la /etc/nginx/sites-available/app.socialpolitician.com.conf

# If it doesn't exist, create it from the deploy folder
sudo cp /var/www/socialpolitician-app/deploy/nginx/app.socialpolitician.com.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/app.socialpolitician.com.conf /etc/nginx/sites-enabled/
```

### Step 4: Test Nginx Config

```bash
sudo nginx -t
```

### Step 5: Make Sure Ports Are Open

```bash
# Check firewall
sudo ufw status

# If needed, allow ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Step 6: Get SSL Certificate

```bash
sudo certbot --nginx -d app.socialpolitician.com
```

This will:
- Automatically get SSL certificate from Let's Encrypt
- Update nginx config with SSL settings
- Set up auto-renewal

### Step 7: Verify SSL

```bash
# Test HTTPS
curl -I https://app.socialpolitician.com

# Should return 200 OK
```

### Step 8: Reload Nginx (if needed)

```bash
sudo systemctl reload nginx
```

## Verify in Browser

1. Open: `https://app.socialpolitician.com`
2. Check browser shows padlock icon 🔒
3. No SSL warnings should appear

## Troubleshooting

**If certbot says "Domain not pointing to this server":**
- Wait a few minutes for DNS propagation
- Verify DNS: `dig +short app.socialpolitician.com`
- Make sure it returns: `69.169.103.23`

**If certbot says "Port 80 is not open":**
```bash
sudo ufw allow 80/tcp
sudo systemctl restart nginx
```

**If nginx config test fails:**
```bash
sudo nginx -t
# Fix any errors shown
```

**Check existing certificates:**
```bash
sudo certbot certificates
```

## After SSL is Working

The site should:
- ✅ Load at `https://app.socialpolitician.com`
- ✅ Show padlock in browser
- ✅ Automatically redirect HTTP → HTTPS
- ✅ Have valid SSL certificate
