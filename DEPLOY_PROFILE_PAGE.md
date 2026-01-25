# Deploy Profile Page Styling

## Quick Deploy Commands

SSH into your VPS and run:

```bash
cd /var/www/socialpolitician-app

# Pull latest changes
git pull origin main

# Install dependencies (if needed)
npm install

# Build the frontend
npm run build

# Reload nginx
sudo systemctl reload nginx
```

## Verify Deployment

After deploying, check:

1. **CSS file exists**: 
   ```bash
   ls -la web/src/pages/PoliticianProfile.css
   ```

2. **Build includes CSS**:
   ```bash
   ls -la dist/assets/*.css
   ```

3. **Check browser**:
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or open in incognito/private window
   - Check DevTools → Network tab to see if CSS is loading

## Expected Changes

After deployment, profile pages should have:
- Light gray background (`#f9fafb`) matching directory pages
- White cards with subtle shadows
- Circular avatar (120px)
- Consistent spacing and typography
- Max-width container (1280px)

## Troubleshooting

If changes don't appear:

1. **Clear browser cache** - Hard refresh or incognito mode
2. **Check build output** - Verify CSS is in `dist/assets/`
3. **Check nginx** - Ensure it's serving the new `dist/` folder
4. **Check file permissions** - Ensure nginx can read the files
