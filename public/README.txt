Pet Care App Icon PNG Set

Recommended placement in a Vite/React app:

Put these files in your public folder:
- icon-512.png
- icon-256.png
- apple-touch-icon.png
- favicon-192.png
- favicon-32.png
- favicon-16.png

Typical use:
- icon-512.png = main PWA icon / high-res app icon
- icon-256.png = backup medium icon
- apple-touch-icon.png = iPhone/iPad home screen icon
- favicon-32.png and favicon-16.png = browser tab icons

Suggested index.html lines:
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />

If you use a manifest.json, set icons to /favicon-192.png and /icon-512.png.
