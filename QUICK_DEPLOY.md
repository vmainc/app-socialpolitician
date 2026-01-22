# 🚀 Quick Deploy Guide

## TL;DR - Get It Live Fast

### On Your VPS:

```bash
# 1. Create directories
sudo mkdir -p /var/www/socialpolitician-app/{web,server,pocketbase/pb_data,pb_linux}
sudo chown -R $USER:$USER /var/www/socialpolitician-app

# 2. Download PocketBase
cd /var/www/socialpolitician-app/pb_linux
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_linux_amd64.zip
unzip pocketbase_linux_amd64.zip && chmod +x pocketbase && rm *.zip

# 3. Upload your project files
# (Use scp, rsync, or git clone from your local machine)

# 4. Install dependencies
cd /var/www/socialpolitician-app
npm install

# 5. Build frontend
npm run build

# 6. Create PocketBase service
sudo tee /etc/systemd/system/socialpolitician-app-pocketbase.service > /dev/null <<EOF
[Unit]
Description=PocketBase for app.socialpolitician.com
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/var/www/socialpolitician-app
ExecStart=/var/www/socialpolitician-app/pb_linux/pocketbase serve --http=127.0.0.1:8091 --dir=/var/www/socialpolitician-app/pocketbase/pb_data
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl start socialpolitician-app-pocketbase.service
sudo systemctl enable socialpolitician-app-pocketbase.service

# 7. Configure Nginx (see DEPLOY_NOW.md for full config)
# Copy nginx config from DEPLOY_NOW.md Step 6

# 8. Get SSL certificate
sudo certbot --nginx -d app.socialpolitician.com

# 9. Done! Visit https://app.socialpolitician.com
```

## 📋 What You Need

- VPS with Ubuntu/Debian
- Domain: `app.socialpolitician.com` pointing to VPS IP
- SSH access
- Node.js 18+ installed

## 🔑 Important URLs

- **Production:** https://app.socialpolitician.com
- **PocketBase Admin:** http://127.0.0.1:8091/_/ (via SSH tunnel)
- **Admin Email:** admin@vma.agency
- **Admin Password:** VMAmadmia42O200!

## 📊 Current Data Status

- ✅ 581 politicians in PocketBase
  - 431 Representatives
  - 100 Senators  
  - 50 Governors
- ✅ All have Wikipedia URLs
- ✅ All have official websites
- ✅ Most have social media profiles

## 🔄 After Initial Deploy - Quick Updates

```bash
cd /var/www/socialpolitician-app
git pull  # or upload new files
npm install
npm run build
sudo systemctl restart socialpolitician-app-pocketbase.service
sudo systemctl reload nginx
```

## 📚 Full Guide

See `DEPLOY_NOW.md` for complete step-by-step instructions.
