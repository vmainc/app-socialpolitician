# DNS Setup for app.socialpolitician.com

## A Record Configuration

The A record for `app.socialpolitician.com` should point to the **same IP address** as `presidents.socialpolitician.com` since both apps run on the same VPS.

## Finding Your VPS IP Address

### Method 1: Check Current DNS (Easiest)

```bash
dig +short presidents.socialpolitician.com
```

This will show the IP address that `presidents.socialpolitician.com` currently points to. Use this same IP for `app.socialpolitician.com`.

### Method 2: Check from VPS

SSH into your VPS and run:

```bash
# Get public IP
curl ifconfig.me

# Or get all IPs
hostname -I
```

### Method 3: Check VPS Provider Dashboard

Log into your VPS provider (e.g., DigitalOcean, Linode, AWS, etc.) and check the server details for the IP address.

## DNS Configuration

Once you have the IP address, create an A record:

```
Type: A
Name: app
Value: [YOUR_VPS_IP_ADDRESS]
TTL: 3600 (or default)
```

**Example:**
```
Type: A
Name: app
Value: 192.0.2.123
TTL: 3600
```

This will make `app.socialpolitician.com` resolve to your VPS IP.

## Verify DNS

After creating the A record, wait a few minutes for DNS propagation, then verify:

```bash
dig +short app.socialpolitician.com
```

It should return the same IP as `presidents.socialpolitician.com`.

## Important Notes

- ✅ Both `presidents.socialpolitician.com` and `app.socialpolitician.com` point to the same VPS IP
- ✅ Nginx on the VPS routes traffic based on the `server_name` directive
- ✅ V1 runs on ports 8090 (PocketBase) and 3000 (Node API)
- ✅ V2 runs on ports 8091 (PocketBase) and 3001 (Node API)
- ✅ Nginx handles the routing automatically based on domain name

## After DNS is Set Up

1. Wait for DNS propagation (5-60 minutes)
2. Get SSL certificate: `sudo certbot --nginx -d app.socialpolitician.com`
3. Verify site loads: `https://app.socialpolitician.com`
