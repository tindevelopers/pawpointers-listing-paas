# Show the Google Map on Your Platform

The listing map uses the **Google Maps Embed API** (iframe). To see the map instead of coordinates + a message, do the following.

## 1. Google Cloud setup

1. **Open Google Cloud Console**  
   [console.cloud.google.com](https://console.cloud.google.com)

2. **Create or select a project**  
   Use the project dropdown at the top to create a new project or pick an existing one.

3. **Enable billing**  
   The Maps Embed API is free (unlimited requests), but Google requires a billing account on the project.  
   [Billing](https://console.cloud.google.com/billing)

4. **Enable the Maps Embed API**  
   - Go to **APIs & Services** → **Library**  
   - Search for **Maps Embed API**  
   - Open it and click **Enable**  
   Or use this link: [Enable Maps Embed API](https://console.cloud.google.com/apis/library/maps-embed-backend.googleapis.com)

5. **Create an API key**  
   - Go to **APIs & Services** → **Credentials**  
   - Click **Create credentials** → **API key**  
   - Copy the new key  
   - (Recommended for production) Restrict the key to **Maps Embed API** and to your website’s domain(s).

## 2. Portal environment variable

In your portal app, set the key so Next.js can use it:

- **Local:** `apps/portal/.env.local`
- **Production (e.g. Vercel):** Project → Settings → Environment Variables

Add:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=your_actual_api_key_here
```

Use your real key; no quotes needed.

## 3. Restart the dev server

Next.js reads `NEXT_PUBLIC_*` at **build/start** time. After adding or changing the variable:

- Stop the dev server (Ctrl+C)
- Start it again, e.g. `pnpm dev` or `pnpm dev:portal` from the repo root

Then reload the listing page. You should see the embedded Google Map with a pin at the listing’s location.

---

**If the map still doesn’t show**

- Confirm the key is set in the same app that serves the page (e.g. `apps/portal/.env.local` for the portal).
- In Google Cloud, confirm **Maps Embed API** is enabled for the project that owns the key.
- If you restricted the key, ensure the current host (e.g. `localhost`, your production domain) is in the allowed HTTP referrers.

**Alternative: Mapbox**

If you prefer not to use Google, set `NEXT_PUBLIC_MAPBOX_TOKEN` instead (and leave the Google key unset). The map will use Mapbox when that token is present.
