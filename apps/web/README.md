# ZerithDB Web

This is the Next.js web app for ZerithDB.

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit
the file.

## Offline App Shell

The production build registers `public/sw.js` as an offline-first service worker template. It
pre-caches the core app shell routes and static assets, then serves `public/offline.html` when a
navigation request cannot reach the network.

The service worker is intentionally registered only in production so local development does not get
stuck behind stale cached bundles. To test it locally:

```bash
pnpm build
pnpm start
```

Open the app, wait for the service worker to register, then use DevTools to switch the browser to
offline mode and reload a cached route. If you need to clear an old worker, use DevTools >
Application > Service Workers > Unregister.

The current app shell cache includes:

- `/`
- `/docs`
- `/playground`
- `/blog`
- `/offline.html`
- shared public assets such as `/logo.svg`, `/favicon.ico`, and `/manifest.webmanifest`

Update `APP_SHELL_URLS` in `public/sw.js` whenever a new route or required shell asset should be
available offline.
