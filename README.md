# RPM Scanner V2

AI-powered beer keg tracking web app for Heineken Myanmar. Scan keg labels with your phone camera, extract Lot Number / Best Before Date / Brand via Heineken GenAI Brewery, and export scanned sessions to CSV.

**Pure static web app — no server, no install, works in any modern browser.**

---

## Features

- Keg / Bottle type selector on landing page (Bottle coming soon)
- Live camera scan with guide box (crops to label area automatically)
- Heineken GenAI Brewery as primary OCR engine (internal company AI)
- Optional Vercel proxy for CORS-safe GenAI calls
- Editable fields with confidence indicators
- Duplicate keg detection
- Per-truck session management with keg counter + progress ring
- CSV export per truck
- Debug panel visible on every scan attempt
- Heineken brand colour scheme (green + red)
- Phone-first layout: full-screen setup, settings accessible only from landing page

---

## Default Brands

`TIGER` `BAWDAR` `HEINEKEN` `ABC`

Manage brands via ⚙ Settings → Manage Lists.

---

## Keg Label Format (Printed Dot-Matrix Ink)

The app reads exactly **3 lines of machine-printed dot-matrix ink** on the keg:

```
Line 1:  L6069104 (08:15)   ← Lot Number  (L + 7 digits — timestamp in parens ignored)
Line 2:  10 SEP 2026        ← Best Before (DD MON YYYY)
Line 3:  BAWDAR E           ← Brand       (extra text after brand is ignored)
```

Two print styles are supported:
- **Bold** — dark/heavy ink on silver metallic keg
- **Thin** — lighter ink on green or silver metallic keg

Line 1 may include a timestamp like `(08:15)` — only L + 7 digits is extracted.  
Line 3 may have extra letters/text after the brand — only the predefined brand is extracted.

Aim the guide box directly at the printed label text.

---

## GenAI Brewery (Primary OCR Engine)

V2 uses Heineken's internal **GenAI Brewery** endpoint (`genai.heineken.com`) as its primary OCR engine. No external API key is required — the endpoint is accessed via the company network or VPN.

**Two call modes:**
- **Direct** — browser calls `genai.heineken.com` directly (requires CORS headers from server)
- **Proxy** — calls route through a Vercel serverless function to avoid CORS issues

Configure the proxy URL in ⚙ Settings → GenAI Proxy URL (leave blank for direct mode).

**Fallback:** If GenAI Brewery is unreachable, the debug panel explains the issue and directs you to check your network connection or proxy setting.

---

## Running Locally (Testing)

**VS Code Live Server (easiest — no install needed):**
1. Install the "Live Server" extension by Ritwick Dey in VS Code
2. Right-click `index.html` → **Open with Live Server**
3. Opens at `http://127.0.0.1:5500` — camera works on this URL

**Python (if installed):**
```bash
python -m http.server 8080
# or on some Windows setups:
py -m http.server 8080
```
Then open `http://localhost:8080`

> Note: opening `index.html` directly as a `file://` URL will work for everything except the camera (browsers require HTTPS or localhost for camera access).

---

## Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push all files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
3. Go to **Settings → Pages → Branch: main → / (root) → Save**
4. Your app is live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

---

## Browser Requirements

- Chrome, Edge, or Safari (iOS 14.3+)
- Camera permission must be granted
- JavaScript enabled
- Works on desktop and mobile

---

## Changelog

| Version | Changes |
|---------|---------|
| V2 r10 | Phone layout polish: fix submit button always hidden by moving base style before phone media query; header shows `<` back arrow (not `‹`); star removed from header. |
| V2 r9 | Phone layout redesign: 10/30/30/30 proportional split (header/camera/fields/footer); sticky "Add Scan" button inside fixed-height fields panel so it never disappears off-screen. |
| V2 r8 | Fix iPhone layout: fixed-height fields panel with sticky Add Scan button; submit button visible in header. |
| V2 r7 | Fix settings modal not opening from landing page. Settings gear removed from app screen — settings accessible only from the landing page. |
| V2 r6 | Disable Microsoft Sign-In / SharePoint submit flow; code retained commented-out for future re-enable. |
| V2 r5 | Move Settings to setup/landing page; full-screen setup on phones; settings no longer reachable mid-session. |
| V2 r4 | UX/UI overhaul: RPM Scanner branding throughout; settings accessible in app header; screen-fit layout; truck dropdown fix. |
| V2 r3 | GenAI prompt tuning: revert to working prompt style (remove `detail:high` that broke all fields); improve bestBefore extraction with label-structure prompt and 2048 px image; stress exactly 7 digits after `L` in lot number prompt. |
| V2 r2 | GenAI reliability: fix JSON parse (greedy regex replaced); lot number recovery logic; proxy debug display; fix wrong model name that caused Vercel timeout; add configurable internal GenAI proxy URL setting; support both proxy and direct call modes. |
| V2 r1 | Simplify to GenAI Brewery only — remove all legacy OCR engine code (Tesseract, Gemini, OpenAI, GCV, PaddleOCR). Always show debug panel on every scan attempt. Fix Tesseract error path to write explanation to debug panel. Fix CORS by routing GenAI through Vercel proxy. Add GenAI Brewery endpoint + debug panel. Heineken GenAI Brewery (internal AI) set as primary OCR engine. |
| V2 r0 | Initial V2 — forked from Keg Scanner v14. |
| v14 | Added OpenAI GPT-4.1 Mini and Google Cloud Vision OCR as selectable engines (engine bar pills: GPT-4.1, GCV). API keys stored in OCR Settings. Configurable Gemini endpoint URL for custom gateways. Mobile UX overhaul: `viewport-fit=cover` + `env(safe-area-inset-bottom)` on FAB/footer/toast so buttons are no longer hidden behind iPhone home bar; sticky Submit footer; `100dvh` layout; 44 px min touch targets; modal max-height with scroll. |
| v13 | SharePoint integration: "Submit & Complete" uploads session data to `heiway.sharepoint.com` (DataP library) via Microsoft Graph API with Azure AD SSO (MSAL.js). Credentials hardcoded; no user config required. PaddleOCR ngrok fix: added `ngrok-skip-browser-warning` header so GitHub Pages can reach a ngrok-tunnelled PaddleOCR server. Ping timeout raised to 5 s. |
| v11 | PaddleOCR local server integration: `ocr_server.py` Flask server on localhost:5001; `js/ocr.js` auto-detects server on localhost and uses PaddleOCR as primary engine, falls back to Tesseract if unavailable. `requirements.txt` added. |
| v10 | Logo: replaced text badge with Heineken Myanmar SVG logo (red star + HEINEKEN/Myanmar in forest green, transparent background). OCR: auto-invert for dark/shadowed kegs; inverted-image retry pass before PSM-4 fallback; G→6 and Z→2 added to lot-number digit correction. |
| v8 | Landing page icons: keg barrel-bulge silhouette + hoop rings + spear valve; Heineken-style bottle with oval label + crown cap. |
| v7 | Camera UI: capture + switch-camera buttons moved inside the viewport (floating overlay at bottom-center); viewport gets rounded corners and padding for a neater framed look; scan status moved to top-left overlay |
| v6 | OCR fix: replaced CSS brightness+contrast (was blowing ink to white) with pixel-level grayscale+threshold; PSM 4 for better handwritten text; raw OCR text panel shows what camera read; keg size 50L defensive reset |
| v5 | Export to Excel (XLSX via SheetJS); table adds Truck/Date/Ship To columns; live photo quality badge (green/orange/red); responsive for phones+tablets+desktop; Keg Size defaults 10L/20L/30L; toast no longer animated-moving |
| v4 | Lot extraction strips timestamps like (13:20); brand extraction handles extra text (BAWDAR NKL); brightness(1.2)+contrast(4) for thin/faint ink; cross-browser regex (no lookbehind); running locally section |
| v3 | Keg/Bottle type selector on landing page; Heineken red (#C8102E); premium UI; OCR guide-box crop; OCR error corrections; back button pre-fills form |
| v2 | Strict 3-line OCR format; TIGER/BAWDAR/HEINEKEN/ABC defaults; OCR preprocessing (grayscale+contrast+PSM6); back button fix |
| v1 | Initial release |
