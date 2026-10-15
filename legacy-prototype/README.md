# StyleVault (`stylevault.app`)
> **Pan-African Intelligence & News Discovery Platform**  
> Covering Business, Tourism, Aviation, Maritime Ports, and AfCFTA Trade Corridors Across All 54 African Countries.

---

## 🌟 What is StyleVault?
StyleVault is a dedicated, zero-cost-first alternative to Google Alerts built specifically for following African markets, industries, and economies.

Instead of configuring dozens of fragmented keyword searches or hitting paywalls, StyleVault provides:
1. **Africa-Wide Chronological Feed**: Real-time dispatches aggregated from trusted African newsrooms.
2. **Top Stories Multi-Source Clusters**: Intelligent grouping of developments confirmed and reported by 2+ independent publishers.
3. **All 54 African Countries Directory**: Filter dispatches instantly by country or African Union region (North, South, East, West, Central).
4. **My Monitor (Custom Intelligence Streams)**: Build personalized multi-criteria streams (Country + Industry + Filter Keywords) saved in the browser without any forced user registration or account barrier.
5. **Saved Vault**: One-tap offline bookmarking for reference and deep dives.
6. **Native Reader Sheet**: Slide-up summary sheet providing metadata, fair-use excerpts, and direct outbound links to the original African publishers.

---

## 🛠️ Architecture & Zero Monthly Operating Cost
- **Frontend**: Clean, lightweight vanilla JavaScript + responsive CSS grid with Plus Jakarta Sans typography.
- **Hosting**: Cloudflare Pages (Free Tier: unlimited requests, globally distributed edge caching).
- **Storage**: Client-side `localStorage` for zero-cost stream persistence and bookmarks.
- **Fair-Use Indexing**: Headings, publication metadata, and fair-use excerpts only. Direct outbound referral links to original newsrooms protect copyright and support African journalism.

---

## 🚀 Running Locally
```bash
# Start the local development server
npm start
# App will run on http://localhost:3000
```

---

## ☁️ Cloudflare Pages Deployment
1. Connect your GitHub repository (`stylevault/stylevault-app`) to Cloudflare Pages.
2. Build Settings:
   - **Framework Preset**: None (Static HTML/JS)
   - **Build Command**: *(leave empty)*
   - **Build Output Directory**: `/`
3. Custom Domain:
   - Assign `stylevault.app` in Cloudflare Pages dashboard. Every `git push` automatically redeploys in seconds.
