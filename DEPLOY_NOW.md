# 🚀 Deploy app.socialpolitician.com - Complete Guide

## 📋 Pre-Deployment Checklist

- [ ] VPS with Ubuntu/Debian
- [ ] SSH access to VPS
- [ ] Sudo access
- [ ] Domain `app.socialpolitician.com` DNS points to VPS IP
- [ ] Node.js 18+ installed on VPS
- [ ] Git installed on VPS

## 🎯 Step-by-Step Deployment

### Step 1: Prepare VPS Directories

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Create directory structure
sudo mkdir -p /var/www/socialpolitician-app/{web,server,pocketbase/pb_data,pb_linux,scripts,backups}
sudo chown -R $USER:$USER /var/www/socialpolitician-app
cd /var/www/socialpolitician-app
```

### Step 2: Download PocketBase Binary

```bash
cd /var/www/socialpolitician-app/pb_linux
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_linux_amd64.zip
unzip pocketbase_linux_amd64.zip
chmod +x pocketbase
rm pocketbase_linux_amd64.zip
cd /var/www/socialpolitician-app
```

### Step 3: Clone/Upload Project

**Option A: Git Clone (if repo is on GitHub/GitLab)**
```bash
cd /var/www/socialpolitician-app
git clone <your-repo-url> temp
mv temp/* temp/.* . 2>/dev/null || true
rmdir temp
```

**Option B: Upload from Local Machine**
```bash
# On your local machine
cd /Users/doughigson/Desktop/DOUGS\ PLUGINS/app.socialpolitician.com
tar czf app.tar.gz --exclude=node_modules --exclude=.git --exclude=pocketbase/pb_data .
scp app.tar.gz user@your-vps-ip:/var/www/socialpolitician-app/

# On VPS
cd /var/www/socialpolitician-app
tar xzf app.tar.gz
rm app.tar.gz
```

### Step 4: Install Dependencies

```bash
cd /var/www/socialpolitician-app

# Install frontend dependencies
npm install

# Install server dependencies (if server directory exists)
if [ -d "server" ]; then
  cd server && npm install && cd ..
fi
```

### Step 5: Create Systemd Services

**Create PocketBase Service:**
```bash
sudo tee /etc/systemd/system/socialpolitician-app-pocketbase.service > /dev/null <<EOF
[Unit]
Description=PocketBase for app.socialpolitician.com (V2)
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/var/www/socialpolitician-app
ExecStart=/var/www/socialpolitician-app/pb_linux/pocketbase serve --http=127.0.0.1:8091 --dir=/var/www/socialpolitician-app/pocketbase/pb_data
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

**Create Node API Service (if needed):**
```bash
sudo tee /etc/systemd/system/socialpolitician-app-api.service > /dev/null <<EOF
[Unit]
Description=Node API for app.socialpolitician.com (V2)
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/var/www/socialpolitician-app/server
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
StandardOutput=file:/tmp/socialpolitician-app-api.log
StandardError=file:/tmp/socialpolitician-app-api.log
Environment=NODE_ENV=production
Environment=POCKETBASE_URL=http://127.0.0.1:8091

[Install]
WantedBy=multi-user.target
EOF
```

**Reload systemd:**
```bash
sudo systemctl daemon-reload
```

### Step 6: Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/app.socialpolitician.com.conf > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name app.socialpolitician.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.socialpolitician.com;

    # SSL certificates (will be created by certbot)
    ssl_certificate /etc/letsencrypt/live/app.socialpolitician.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.socialpolitician.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Root directory for frontend
    root /var/www/socialpolitician-app/web/dist;
    index index.html;

    # Logging
    access_log /var/log/nginx/app.socialpolitician.com.access.log;
    error_log /var/log/nginx/app.socialpolitician.com.error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # PocketBase API proxy
    location /pb/ {
        proxy_pass http://127.0.0.1:8091/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Node API proxy (if needed)
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Static assets with caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/app.socialpolitician.com.conf /etc/nginx/sites-enabled/
sudo nginx -t
```

### Step 7: Build Frontend

```bash
cd /var/www/socialpolitician-app

# Build frontend
npm run build

# Verify no localhost references
if grep -r "localhost\|127.0.0.1" web/dist 2>/dev/null; then
  echo "❌ ERROR: Found localhost in build!"
  exit 1
else
  echo "✅ Build OK: No localhost found"
fi
```

### Step 8: Initialize PocketBase

```bash
# Start PocketBase
sudo systemctl start socialpolitician-app-pocketbase.service
sudo systemctl enable socialpolitician-app-pocketbase.service

# Wait for startup
sleep 5

# Verify it's running
curl http://127.0.0.1:8091/api/health

# Create admin account via SSH tunnel:
# On local machine: ssh -L 8091:127.0.0.1:8091 user@vps
# Then open: http://localhost:8091/_/
# Email: admin@vma.agency
# Password: VMAmadmia42O200!
```

### Step 9: Set Up Collections in PocketBase

1. **Access PocketBase Admin UI:**
   - SSH tunnel: `ssh -L 8091:127.0.0.1:8091 user@vps`
   - Open: `http://localhost:8091/_/`
   - Login with admin credentials

2. **Create Collections:**
   - Create `politicians` collection with fields:
     - name (Text, Required)
     - slug (Text, Required)
     - state (Text)
     - district (Text)
     - current_position (Text)
     - political_party (Text)
     - website_url (URL)
     - wikipedia_url (URL)
     - facebook_url (URL)
     - x_url (URL)
     - instagram_url (URL)
     - youtube_url (URL)
     - linkedin_url (URL)
     - tiktok_url (URL)
     - truth_social_url (URL)
     - position_start_date (Date)
     - photo (File)
   
   - Set API rules:
     - List: Public
     - View: Public
     - Create/Update/Delete: Admin only

### Step 10: Import Data

**Option A: Export from Local and Import**
```bash
# On local machine - export politicians data
cd /Users/doughigson/Desktop/DOUGS\ PLUGINS/app.socialpolitician.com
POCKETBASE_URL=http://127.0.0.1:8091 \
POCKETBASE_ADMIN_EMAIL=admin@vma.agency \
POCKETBASE_ADMIN_PASSWORD='VMAmadmia42O200!' \
npx tsx -e "(async () => {
  const PocketBase = (await import('pocketbase')).default;
  const pb = new PocketBase('http://127.0.0.1:8091');
  await pb.admins.authWithPassword('admin@vma.agency', 'VMAmadmia42O200!');
  const politicians = await pb.collection('politicians').getFullList();
  console.log(JSON.stringify(politicians, null, 2));
})()" > politicians-export.json

# Upload to VPS
scp politicians-export.json user@vps:/tmp/

# On VPS - import
# Use PocketBase Admin UI to import JSON
```

**Option B: Use PocketBase Admin UI**
- Go to Collections → politicians → Import
- Upload JSON file

### Step 11: Get SSL Certificate

```bash
sudo certbot --nginx -d app.socialpolitician.com
```

### Step 12: Start All Services

```bash
# Start PocketBase
sudo systemctl start socialpolitician-app-pocketbase.service

# Start Node API (if needed)
sudo systemctl start socialpolitician-app-api.service

# Reload nginx
sudo systemctl reload nginx

# Check status
sudo systemctl status socialpolitician-app-pocketbase.service
sudo systemctl status socialpolitician-app-api.service
```

### Step 13: Verify Deployment

```bash
# Health checks
curl https://app.socialpolitician.com/pb/api/health
curl https://app.socialpolitician.com/api/health  # If API exists

# Check services
sudo systemctl status socialpolitician-app-pocketbase.service
sudo systemctl status socialpolitician-app-api.service
```

## ✅ Success Criteria

- [ ] `https://app.socialpolitician.com/` loads
- [ ] `/pb/api/health` returns 200
- [ ] Politicians collection has 581 records
- [ ] No console errors in browser
- [ ] All services running

## 🔄 Update Deployment (After Changes)

```bash
cd /var/www/socialpolitician-app

# Backup PocketBase
cp -r pocketbase/pb_data backups/pb_data-$(date +%Y%m%d-%H%M%S)

# Pull latest code
git pull  # or upload new files

# Install dependencies
npm install
cd server && npm install && cd ..

# Build
npm run build

# Restart services
sudo systemctl restart socialpolitician-app-pocketbase.service
sudo systemctl restart socialpolitician-app-api.service
sudo systemctl reload nginx
```

## 🆘 Troubleshooting

**Check logs:**
```bash
sudo journalctl -u socialpolitician-app-pocketbase.service -f
sudo journalctl -u socialpolitician-app-api.service -f
sudo tail -f /var/log/nginx/app.socialpolitician.com.error.log
```

**Check ports:**
```bash
sudo lsof -i :8091  # PocketBase
sudo lsof -i :3001  # Node API
```

**Test nginx config:**
```bash
sudo nginx -t
```

---

**Ready to deploy!** Follow these steps in order on your VPS.
