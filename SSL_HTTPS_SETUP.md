# SSL/HTTPS Configuration Guide for GENZ WhatsApp

## Overview

This guide covers setting up SSL/HTTPS for GENZ WhatsApp using Let's Encrypt certificates with Nginx.

## Prerequisites

- Domain name pointing to your server IP
- Ubuntu/Debian server (or similar Linux distribution)
- Root or sudo access
- Nginx installed and configured
- Port 80 and 443 open in firewall

## Method 1: Let's Encrypt with Certbot (Recommended)

### Step 1: Install Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

### Step 2: Obtain SSL Certificate

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

You'll be prompted to:
1. Enter email address for renewal notices
2. Agree to terms of service
3. Choose whether to share email with EFF

Certbot will automatically:
- Obtain SSL certificate
- Configure Nginx to use HTTPS
- Set up auto-renewal

### Step 3: Verify SSL Configuration

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Test SSL Certificate

Visit: https://your-domain.com

You should see the secure lock icon in your browser.

### Step 5: Test Auto-Renewal

Certbot sets up auto-renewal by default. Test it:

```bash
sudo certbot renew --dry-run
```

## Method 2: Manual SSL Configuration

### Step 1: Generate Self-Signed Certificate (For Testing)

```bash
sudo mkdir -p /etc/ssl/certs/genz-whatsapp
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/certs/genz-whatsapp/privkey.pem \
  -out /etc/ssl/certs/genz-whatsapp/fullchain.pem
```

### Step 2: Update Nginx Configuration

Edit your Nginx config:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/ssl/certs/genz-whatsapp/fullchain.pem;
    ssl_certificate_key /etc/ssl/certs/genz-whatsapp/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # ... rest of your configuration
}
```

### Step 3: Test and Reload

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Configuration Options

### Recommended SSL Settings

Add these to your Nginx SSL configuration:

```nginx
# SSL Protocols and Ciphers
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers off;

# SSL Session Cache
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/letsencrypt/live/your-domain.com/chain.pem;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

### Security Headers

Add these headers to your Nginx configuration:

```nginx
# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

## Certificate Renewal

### Automatic Renewal (Let's Encrypt)

Certbot sets up a systemd timer for automatic renewal. Verify it:

```bash
sudo systemctl status certbot.timer
```

### Manual Renewal

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Force Renewal

```bash
sudo certbot renew --force-renewal
```

## Troubleshooting

### Certificate Not Working

1. Check certificate files exist:
```bash
ls -la /etc/letsencrypt/live/your-domain.com/
```

2. Check Nginx configuration:
```bash
sudo nginx -t
```

3. Check Nginx error logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

### Mixed Content Errors

If you see mixed content errors, ensure all resources use HTTPS:

1. Update frontend environment variables:
```bash
VITE_API_URL=https://your-domain.com
VITE_SOCKET_URL=https://your-domain.com
```

2. Rebuild frontend:
```bash
cd frontend
npm run build
```

### Certificate Expired

```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Port 443 Blocked

Check firewall rules:

```bash
sudo ufw status
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp
```

## Testing SSL Configuration

### Online SSL Testers

- SSL Labs: https://www.ssllabs.com/ssltest/
- SSL Checker: https://www.sslshopper.com/ssl-checker.html

### Command Line Testing

```bash
# Test SSL connection
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate details
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout
```

## Redirect HTTP to HTTPS

Ensure your Nginx configuration redirects HTTP to HTTPS:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}
```

## WebSocket Support (Socket.IO)

For Socket.IO to work with SSL, ensure:

```nginx
location /socket.io {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # SSL WebSocket support
    proxy_set_header X-Forwarded-Proto https;
}
```

## Backend Configuration

Update backend `.env` for HTTPS:

```bash
FRONTEND_URL=https://your-domain.com
PUBLIC_API_URL=https://your-domain.com
```

## Monitoring SSL Certificate

### Check Certificate Expiry

```bash
sudo certbot certificates
```

### Set Up Expiry Alerts

Create a cron job to check certificate expiry:

```bash
# Check certificate expiry 30 days before expiration
0 0 * * * /usr/bin/certbot certificates | grep -A 2 "NOT AFTER" | mail -s "SSL Certificate Expiry" admin@your-domain.com
```

## Backup SSL Certificates

```bash
# Backup Let's Encrypt certificates
sudo tar -czf /backup/letsencrypt-backup-$(date +%Y%m%d).tar.gz /etc/letsencrypt/

# Restore if needed
sudo tar -xzf /backup/letsencrypt-backup-YYYYMMDD.tar.gz -C /
```

## Wildcard Certificates (Optional)

For wildcard certificates (*.your-domain.com):

```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d "*.your-domain.com" -d "your-domain.com"
```

You'll need to add DNS TXT records as instructed by certbot.

## Summary

- Use Let's Encrypt with Certbot for free SSL certificates
- Configure Nginx with recommended SSL settings
- Set up automatic certificate renewal
- Test SSL configuration with online tools
- Monitor certificate expiry
- Backup certificates regularly

Your application will now be served over HTTPS with proper security headers and SSL configuration.
