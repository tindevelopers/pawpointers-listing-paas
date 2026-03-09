# Voice UI Runtime Investigation Guide

## Why the Repo Has Been Ruled Out

The repository has been exhaustively searched. **The following do not exist in the codebase:**

| Missing Item | Location Checked |
|--------------|------------------|
| Microphone icon/button | `AIChat.tsx`, `ChatWidget.tsx` — input area has text input + send button only |
| `SpeechRecognition` / `webkitSpeechRecognition` | Grep across entire repo — only in `.cursor/rules/voice-chat-ui.mdc` (convention doc, not implementation) |
| `speechSynthesis` / `speak()` | No matches |
| TTS playback logic | No matches |
| `/api/voice/*` routes | Not implemented |
| Third-party chat widgets (Intercom, Drift, Crisp, etc.) | None found |
| Builder.io voice components | AIChat/ChatWidget not registered; homepage uses native `app/page.tsx`, not Builder.io |

**Conclusion:** The microphone and TTS you see in the live UI are **not** coming from this repository's source code.

---

## Fastest Verification Path (Do This First)

**Goal:** Identify in ~5 minutes whether the microphone comes from (a) this app, (b) an external script, (c) a browser extension, or (d) another deployment.

### Step 1: Incognito + Extensions Off (2 min)

1. Open an **Incognito/Private window** (extensions are usually disabled by default).
2. Navigate to the **exact live URL** where you see the microphone.
3. **Check:** Does the microphone icon still appear?

| Result | Implication |
|--------|-------------|
| Microphone **disappears** | Likely **browser extension** |
| Microphone **still there** | Extension unlikely; proceed to Step 2 |

### Step 2: Inspect the Microphone Element (2 min)

1. Right-click the **microphone icon** → **Inspect** (or Inspect Element).
2. In the Elements panel, note:

| What to Check | What It Tells You |
|---------------|-------------------|
| **Parent chain** | Does it sit under a React root (`#__next`, `#root`)? Or under an iframe / shadow DOM? |
| **`data-*` attributes** | `data-builder-*` → Builder.io; `data-widget-*` → third-party widget; `data-extension-*` → extension |
| **`id` or `class`** | Unique names like `intercom-*`, `drift-*`, `crisp-*` → external widget |
| **Shadow DOM** | `#shadow-root` → web component (often external SDK) |
| **iframe** | If the mic is inside `<iframe>` → separate origin/widget |

3. **Check:** Is the microphone inside an `<iframe>` or `#shadow-root`?

| Result | Implication |
|--------|-------------|
| Inside **iframe** | Third-party embed (chat widget, Shopify app, etc.) |
| Inside **shadow DOM** | Web component / external SDK |
| Direct child of React tree | Could be this app (if deployment has different code) or extension overlay |

### Step 3: Sources Search (1 min)

1. DevTools → **Sources** tab.
2. Press **Ctrl+Shift+F** (Cmd+Option+F on Mac) to search all sources.
3. Search for: `SpeechRecognition` or `webkitSpeechRecognition`.
4. Note the **file path** of any match:

| File Path | Implication |
|-----------|-------------|
| `chrome-extension://...` | **Browser extension** |
| `cdn.*.com/...` or external domain | **External script** |
| `_next/static/...` or your app domain | **This app** (deployment has different code) |
| No matches | STT may use different API or be polyfilled |

---

## Root-Cause Hypothesis Ranking

Ranked from **most likely** to **least likely**:

| Rank | Hypothesis | Likelihood | Rationale |
|------|------------|------------|-----------|
| 1 | **Browser extension** | High | Extensions commonly add mic icons to inputs; no repo code needed |
| 2 | **Different deployment/branch** | High | Staging/preview/fork may have voice code not in main |
| 3 | **Third-party chat widget** | Medium | External embed (Intercom, Drift, Crisp, etc.) could add voice |
| 4 | **Shopify theme/app extension** | Medium | If on Shopify, theme or app embed could inject voice UI |
| 5 | **Tag manager / analytics script** | Low | GTM or similar could load a widget with voice |
| 6 | **Builder.io custom block** | Low | Homepage doesn't use Builder.io; other pages might |
| 7 | **This repo (current main)** | Ruled out | No voice implementation exists |

---

## Phase 1 — Verify the Live Page Source

### 1.1 Determine What You're Actually Testing

| Check | How to Verify |
|-------|----------------|
| **Deployed URL** | Copy the full URL from the address bar (including subdomain, path, query params) |
| **Deployment provider** | Vercel, Netlify, custom host? Check response headers or hosting docs |
| **Branch/environment** | Preview URL? (`*.vercel.app`, `*-git-*.netlify.app`) vs production domain |
| **Build/commit** | Look for `x-vercel-deployment-id`, `x-netlify-id`, or build metadata in response headers |

### 1.2 Compare Live Page vs Repo

**Homepage structure (from `app/page.tsx`):**

- Hero section with gradient (`from-orange-500 via-orange-400 to-cyan-500`)
- Two tabs: "Search" and "AI Chat"
- Chat input: single `<input>` + send button (no mic in repo)
- Trust signals: "4.8/5 avg rating", "10,000+ providers", "Verified & Trusted"

**What to check:**

1. Does the live page have the same tab structure (Search | AI Chat)?
2. In Elements, find the input container. Does it have:
   - One input + one send button (repo behavior), or
   - One input + **microphone button** + send button (not in repo)?

**If the live page has a microphone button:** The live page is **not** rendering the same code as the current repo (or something is injecting it).

### 1.3 Mismatch Statement

If the DOM structure differs from the repo (e.g., microphone present when repo has none):

> **"The live page is not rendering the same code that exists in this repository."**

Possible reasons: different branch, different deployment, injection by script/extension/embed.

---

## Phase 2 — Trace the Microphone Element in the Live DOM

### 2.1 Inspection Steps

1. **Right-click microphone icon** → **Inspect**.
2. In the Elements panel, record:

```
Element: <button> / <div> / <input> ?
Tag:
ID:
Classes:
data-* attributes:
aria-* attributes:
Parent element (repeat up to <body>):
  - ...
  - ...
  - <body> or <iframe> or #shadow-root?
```

### 2.2 Decision Tree

```
Is the microphone inside an <iframe>?
├── YES → Third-party embed. Check iframe src= (domain, path).
└── NO
    └── Is it inside #shadow-root?
        ├── YES → Web component / external SDK.
        └── NO
            └── What is the parent chain?
                ├── #__next, #root, [data-nextjs-*] → React app (this app or fork)
                ├── [data-intercom-*], [data-drift-*], etc. → Named third-party widget
                ├── chrome-extension:// in ancestor → Extension
                └── Generic divs with hashed classes → Could be this app (different build)
```

### 2.3 Known External Widget Markers

| Provider | Typical Markers |
|----------|-----------------|
| Intercom | `#intercom-container`, `intercom-*` |
| Drift | `drift-*`, `drift-widget` |
| Crisp | `crisp-*`, `crisp-client` |
| Zendesk | `zEWidget`, `zendesk-*` |
| HubSpot | `hs-chat-widget`, `hubspot-*` |
| Tawk | `tawk-*` |
| Tidio | `tidio-*` |
| Shopify App Block | `shopify-app-embed`, `app-embed` |

---

## Phase 3 — Check for External Runtime Injection

### 3.1 Network Tab

1. DevTools → **Network**.
2. Reload the page.
3. Filter by **JS** (or "Doc" + "Script").
4. Look for:

| Script Source | Possible Role |
|---------------|---------------|
| `cdn.builder.io` | Builder.io (usually not on homepage) |
| `intercom`, `drift`, `crisp`, `zendesk`, `hubspot` | Chat/support widgets |
| `cdn.shopify.com`, `shopify.app` | Shopify theme/app |
| `googletagmanager.com`, `gtag`, `gtm` | Tag manager (can load other scripts) |
| `chrome-extension://` | Browser extension |
| `tts`, `speech`, `transcribe`, `synthesize` in URL | STT/TTS service |
| Any script you don't recognize | Potential voice/chat injector |

### 3.2 Sources Tab — Global Search

Search for these strings (Ctrl+Shift+F):

| Search Term | Purpose |
|-------------|---------|
| `SpeechRecognition` | STT API |
| `webkitSpeechRecognition` | STT (Chrome) |
| `speechSynthesis` | TTS API |
| `speak(` | TTS playback |
| `getUserMedia` | Microphone access |
| `microphone` | Voice UI logic |
| `transcribe` | STT service calls |
| `synthesize` | TTS service calls |

**For each match:** Note the **full path** (e.g. `https://example.com/widget.js` vs `chrome-extension://abc123/script.js`).

### 3.3 Elements Panel — Script Tags

1. In Elements, expand `<head>` and `<body>`.
2. List all `<script>` tags (including `src` and inline).
3. Cross-reference with this repo: `app/layout.tsx` does not add external scripts. Any extra scripts are injected externally.

### 3.4 Console Checks

Run in the Console:

```javascript
// 1. List all script tags
document.querySelectorAll('script[src]').forEach(s => console.log(s.src));

// 2. Check for common widget globals
console.log({
  intercom: typeof window.Intercom,
  drift: typeof window.drift,
  crisp: typeof window.$crisp,
  zendesk: typeof window.zE,
});

// 3. Check if microphone is in an iframe
document.querySelectorAll('iframe').forEach((f, i) => 
  console.log(`iframe ${i}:`, f.src, f.id, f.className)
);
```

---

## Phase 4 — Verify Browser Extension Hypothesis

### 4.1 Incognito Test

1. Open **Incognito/Private** window (extensions usually off).
2. Go to the same URL.
3. **Does the microphone appear?**
   - **No** → Strong evidence for extension.
   - **Yes** → Extension unlikely; continue other checks.

### 4.2 Disable Extensions

1. Go to `chrome://extensions` (or equivalent).
2. Disable **all** extensions.
3. Reload the page.
4. **Does the microphone disappear?**
   - **Yes** → Extension is the source. Re-enable one by one to find which.

### 4.3 Identify Extension Scripts in Sources

1. DevTools → Sources.
2. In the file tree, look for `chrome-extension://` or `moz-extension://`.
3. Expand and search for `SpeechRecognition`, `speechSynthesis`, `microphone`.
4. If matches are only in extension paths → extension is responsible.

### 4.4 Extension DOM Markers

Extensions often inject:

- `id` or `class` with extension name
- `data-extension-id` or similar
- Elements under a wrapper div with a random or extension-specific id

---

## Phase 5 — Verify Different Deployment or Branch

### 5.1 Deployment Metadata

| Provider | How to Check |
|----------|---------------|
| **Vercel** | Response header `x-vercel-id` or `x-vercel-deployment-id`; preview URLs include branch name |
| **Netlify** | `x-nf-request-id`; branch in preview URL |
| **Custom** | Check `/api/health` or similar for build/commit info |

### 5.2 Environment / Build Artifacts

- Check for `/version`, `/build-info`, or similar endpoints.
- Look for commit SHA or build ID in HTML comments or meta tags.

### 5.3 Branch Comparison

```bash
# In this repo
git branch -a
git log -1 --oneline  # Current commit
```

Compare with the deployment: does the live site match this commit, or a different branch (e.g. `dev-tanny`)?

### 5.4 Alternate Domains

- `staging.example.com` vs `example.com`
- `*.vercel.app` vs custom domain
- Different subdomains may point to different builds.

---

## Phase 6 — Shopify / Embed-Specific Check

### 6.1 Is This a Shopify Storefront?

- URL like `*.myshopify.com` or a custom domain connected to Shopify.
- This repo is a Next.js app; it may be embedded in Shopify or run separately.

### 6.2 Shopify Injection Points

| Source | Where to Look |
|-------|---------------|
| **Theme app extensions** | Theme → App embeds |
| **Theme.liquid** | `{% render %}` or `{% include %}` for app blocks |
| **Script tags** | `theme.liquid` or `layout/theme.liquid` |
| **App embeds** | Shopify Admin → Apps → [App] → Embed |

### 6.3 If Next.js Is Embedded in Shopify

- The page may be an iframe or a section that loads your app.
- The microphone could be from:
  - Your app (if that deployment has voice code)
  - Shopify theme
  - Another app embed
  - A script in the theme

### 6.4 How to Check

1. Inspect the microphone element.
2. If it's inside an iframe, check the iframe `src`:
   - Your app domain → your app (or its deployment)
   - `cdn.shopify.com` or Shopify domain → theme/app
3. In the main page (outside iframes), search for `shopify` in the DOM and in script URLs.

---

## Evidence Mapping

| Hypothesis | Evidence That Confirms | Evidence That Disconfirms |
|------------|------------------------|---------------------------|
| **Browser extension** | Mic disappears in Incognito; `SpeechRecognition` only in `chrome-extension://` | Mic present in Incognito with all extensions off |
| **Different deployment** | Live DOM matches a different branch; build ID/commit differs | Live DOM matches current repo; same build/commit |
| **Third-party widget** | Mic inside iframe or element with `data-intercom-*` etc. | Mic is direct child of your React tree with no external markers |
| **Shopify/theme** | Mic inside Shopify iframe or theme script; `shopify` in parent chain | Not a Shopify storefront; no Shopify scripts |
| **Tag manager** | GTM loads a script that contains voice code | No GTM; no unknown scripts |
| **This repo (main)** | N/A — ruled out | N/A |

---

## Runtime Verification Checklist

Use this as a step-by-step checklist:

- [ ] **Incognito test:** Microphone present? (Y/N)
- [ ] **Extensions disabled:** Microphone present? (Y/N)
- [ ] **Inspect microphone:** Tag, id, classes, data-* attributes
- [ ] **Parent chain:** React root / iframe / shadow DOM?
- [ ] **Sources search:** `SpeechRecognition` found in: _______________
- [ ] **Sources search:** `speechSynthesis` found in: _______________
- [ ] **Network:** List external JS URLs: _______________
- [ ] **Console:** `window.Intercom`, `window.drift`, etc.: _______________
- [ ] **Deployment:** URL, provider, branch: _______________
- [ ] **Shopify:** Is this a Shopify storefront? (Y/N)
- [ ] **Iframe count:** How many? Sources: _______________

---

## Clear Conclusion Template

After running the checks, fill in:

> **The voice UI (microphone and TTS) is coming from:**
>
> [ ] Browser extension: _______________
> [ ] Different deployment/branch: _______________
> [ ] Third-party widget: _______________
> [ ] Shopify theme/app: _______________
> [ ] Other: _______________
> [ ] Insufficient evidence — missing: _______________

---

## If Evidence Is Insufficient

State exactly what is missing, for example:

- "Need to know: live URL and deployment provider."
- "Need to know: result of Incognito test (does mic disappear?)."
- "Need to know: parent element of the microphone (iframe vs React root vs shadow DOM)."
- "Need to know: output of Sources search for `SpeechRecognition`."

Those observations will narrow down the source.
