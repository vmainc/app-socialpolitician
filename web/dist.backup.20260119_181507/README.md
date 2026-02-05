# Public Assets

This folder contains static assets that are served from the root of the site.

## Logo

Place your logo image here as `logo.png`. The Navigation component expects it at `/logo.png`.

The logo should be:
- Format: PNG (with transparency) or SVG
- Recommended size: 200px width (height will scale proportionally)
- The Navigation component will display it at 40px height (32px on mobile)

## Adding Your Logo

1. Save your logo image as `logo.png` in this folder
2. The Navigation component will automatically display it
3. If you use a different filename, update `Navigation.tsx`:
   ```tsx
   <img src="/your-logo.png" alt="Social Politician" className="logo-img" />
   ```
