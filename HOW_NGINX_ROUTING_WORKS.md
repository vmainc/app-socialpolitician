# How Nginx Routes Multiple Domains to Same IP

## ✅ Yes! Both domains can point to the same IP

Both `app.socialpolitician.com` and `presidents.socialpolitician.com` can point to the **same IP address** (`69.169.103.23`), and Nginx will serve different content from different directories based on the domain name.

## How It Works

Nginx uses **virtual hosts** (server blocks) to route traffic based on the `server_name` directive:

### presidents.socialpolitician.com (V1)
```nginx
server {
    listen 443 ssl http2;
    server_name presidents.socialpolitician.com;
    
    # Serves from V1 directory
    root /var/www/presidents.socialpolitician.com/web/dist;
    
    # V1 PocketBase on port 8090
    location /pb/ {
        proxy_pass http://127.0.0.1:8090/;
    }
    
    # V1 Node API on port 3000
    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
    }
}
```

### app.socialpolitician.com (V2)
```nginx
server {
    listen 443 ssl http2;
    server_name app.socialpolitician.com;
    
    # Serves from V2 directory
    root /var/www/socialpolitician-app/web/dist;
    
    # V2 PocketBase on port 8091
    location /pb/ {
        proxy_pass http://127.0.0.1:8091/;
    }
    
    # V2 Node API on port 3001
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
    }
}
```

## Directory Structure on VPS

```
/var/www/
├── presidents.socialpolitician.com/    # V1 app
│   ├── web/dist/                      # V1 frontend
│   ├── server/                        # V1 Node API (port 3000)
│   └── pocketbase/pb_data/            # V1 PocketBase (port 8090)
│
└── socialpolitician-app/              # V2 app
    ├── web/dist/                      # V2 frontend
    ├── server/                        # V2 Node API (port 3001)
    └── pocketbase/pb_data/            # V2 PocketBase (port 8091)
```

## DNS Configuration

Both domains point to the same IP:

```
presidents.socialpolitician.com  A  69.169.103.23
app.socialpolitician.com         A  69.169.103.23
```

## How Nginx Chooses Which Server Block

1. Client requests `https://app.socialpolitician.com/`
2. Request arrives at IP `69.169.103.23` on port 443
3. Nginx checks the `Host` header: `app.socialpolitician.com`
4. Nginx matches `server_name app.socialpolitician.com`
5. Nginx serves from `/var/www/socialpolitician-app/web/dist`
6. API calls go to port 8091 (PocketBase) and 3001 (Node API)

## Benefits

✅ **Same IP, different apps** - No need for multiple servers  
✅ **Isolated data** - Separate PocketBase instances  
✅ **Independent deployments** - Update one without affecting the other  
✅ **Different ports** - No conflicts between V1 and V2 services  
✅ **Cost effective** - One VPS, multiple apps  

## Verification

After setting up both domains:

```bash
# Check DNS (both should return same IP)
dig +short presidents.socialpolitician.com
dig +short app.socialpolitician.com

# Both should return: 69.169.103.23

# Test sites
curl -I https://presidents.socialpolitician.com
curl -I https://app.socialpolitician.com

# Both should return 200 OK, but serve different content
```

## Summary

**Yes, absolutely!** Both domains can point to the same IP address, and Nginx will automatically route them to different directories and backend services based on the domain name. This is standard practice and exactly how virtual hosting works.
