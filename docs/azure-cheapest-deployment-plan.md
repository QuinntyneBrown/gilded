# Cheapest Azure Deployment Plan

Last updated: 2026-04-19

## Goal

Deploy the current Gilded codebase to Azure for the lowest possible monthly spend, with the smallest architecture change from the repo as it exists today.

## Recommendation

Use **one Azure App Service on Linux** for both the Angular frontend and the Node backend.

This is the cheapest fit for the current repo because:

- the frontend already calls relative `/api/...` routes, so same-origin hosting is the simplest shape
- the backend is a single long-running Node HTTP server, not an Azure Functions-style app
- the app currently keeps users, sessions, couples, ratings, reviews, shortlist data, and notes **in memory**, so splitting the app across multiple stateless services would add work without solving durability

## Architecture

Deploy one App Service web app:

- Angular app built once during CI/CD
- backend process serves both:
  - static files from the Angular build output
  - existing `/api/*` routes
- uploaded photos written to App Service persistent content storage, not temp storage
- no Azure SQL
- no Cosmos DB
- no Redis
- no Front Door
- no Blob Storage on day one
- no Application Insights on day one

This keeps Azure spend at the floor. It is a **demo / low-risk pilot** deployment, not a durable production architecture.

## Pricing

### Lowest possible Azure spend

Use **App Service Free (F1)** first.

- Compute: **$0/month**
- Included limits from Azure pricing:
  - shared compute
  - **60 CPU minutes/day**
  - **1 GB RAM**
  - **1 GB storage**
- Internet egress:
  - **first 100 GB/month free** from North America/Europe
  - then **$0.087/GB**

Practical monthly total:

- **$0/month** if you stay on the default Azure hostname and keep egress under 100 GB/month
- example: 150 GB/month outbound traffic from Canada Central or another North America region adds about **$4.35/month** in egress

### Cheapest paid fallback

Move to **App Service Basic B1** when you need a real public hostname, more headroom, or fewer free-tier constraints.

- Compute: **about $39/month**
- Included limits from Azure pricing:
  - **1 vCPU**
  - **1.75 GB RAM**
  - **10 GB storage**
- Managed certificate:
  - **free** on Basic and above
- App Service Domain if bought through Azure:
  - **$11.99/year**
- Internet egress:
  - same as above: first 100 GB/month free, then $0.087/GB from North America/Europe

Practical monthly total:

- **about $39/month** on the default Azure hostname
- **about $40/month effective baseline** if you average the Azure-purchased domain across the year
- add bandwidth over 100 GB/month as needed

### What I am intentionally not paying for

To stay at the cheapest price point, this plan does **not** add:

- a database
- Blob Storage
- Azure Functions
- Static Web Apps
- Front Door
- Key Vault
- Azure-hosted email

If real email is needed, the lowest-cost option is to keep using an existing SMTP provider instead of adding another Azure service immediately.

## Why not Static Web Apps + Functions?

Azure Static Web Apps Free plus Azure Functions Consumption can also be very cheap, sometimes near zero at low traffic. I am **not** recommending it for this repo right now because it would require a larger rewrite:

- the backend is not organized as Azure Functions
- the app depends on in-memory session and domain state
- Functions storage and execution billing are separate
- splitting the frontend and backend adds complexity before the app has durable persistence

That can become the next cost-optimization step later, after persistence is built.

## Required Repo Changes Before Deploying

These are the minimum code changes needed for the App Service plan to work cleanly.

### 1. Respect Azure's `PORT`

`backend/src/server.ts` currently binds to port `3000` directly. Azure App Service expects the app to listen on `process.env.PORT`.

Change required:

- replace the hard-coded `3000` listener with `Number(process.env.PORT ?? 3000)`

### 2. Serve the Angular build from the backend

The frontend is currently a separate dev server. For the cheapest Azure setup, the backend should serve the built frontend files and return `index.html` for SPA routes.

Change required:

- add static file serving for the Angular production output
- add an SPA fallback for non-API routes

### 3. Add a production startup path

The repo has frontend build scripts, but the backend currently runs with `tsx watch` in development and has no production start path.

Change required:

- add a production `start` script
- either:
  - add a real backend build output, or
  - intentionally run the TypeScript server with `tsx` in the deployed app artifact

The cleaner long-term option is a real backend build, but using `tsx` is acceptable for the cheapest first deployment if the artifact is built in CI and deployed as-is.

### 4. Stop using temp storage for photos

`backend/src/counsellor/photo.ts` defaults to `tmpdir()`, which is the wrong location for Azure durability.

Change required:

- set `PHOTO_DIR=/home/site/data/photos`

Azure App Service content storage is persistent across restarts and shared across instances. That is the only storage model that fits this codebase cheaply on App Service.

### 5. Do not enable captured-email mode in Azure

`CAPTURE_EMAILS=1` exposes dev-only endpoints and is not appropriate for a public deployment.

Set in Azure:

- `CAPTURE_EMAILS` unset
- real `SMTP_*` settings if signup, reset, and invite flows must work

### 6. Set the minimum app settings

Recommended Azure app settings:

- `APP_URL=https://<your-app>.azurewebsites.net`
- `PHOTO_DIR=/home/site/data/photos`
- `NOTE_MASTER_KEY=<64 hex chars>`
- `SMTP_HOST=<value>`
- `SMTP_PORT=587`
- `SMTP_USER=<value>`
- `SMTP_PASS=<value>`
- `SMTP_FROM=<value>`
- `GEOCODING_API_KEY=<value>` only if location search must work in Azure

## Deployment Steps

### Phase 1: Cheapest demo deployment

1. Make the code changes above.
2. Create one Linux App Service in **Canada Central**.
3. Use **Free (F1)** first.
4. Deploy from GitHub Actions or `az webapp up`.
5. Set the app settings listed above.
6. Verify:
   - `GET /health`
   - frontend loads from the same hostname
   - `/api/auth/signup`
   - `/api/auth/login`
   - counsellor photo upload writes into `/home/site/data/photos`

Expected Azure monthly cost:

- **$0/month** under the Free tier limits and under 100 GB/month egress

### Phase 2: Smallest safe public upgrade

Upgrade only when one of these becomes true:

- you need a custom domain with HTTPS
- you hit the 60 CPU minutes/day ceiling
- memory pressure becomes visible
- you need a less fragile public demo

Upgrade path:

1. Scale from **F1** to **B1**.
2. Bind the custom domain.
3. Use a free managed certificate.

Expected Azure monthly cost:

- **about $39/month** plus any domain and bandwidth overage

## Risks and Limits

This plan is cheap because it avoids persistence services. That means:

- all in-memory domain data still disappears when the app restarts
- only files written into App Service content storage survive restarts
- F1 is explicitly a dev/test tier with no SLA
- B1 is still a single-instance deployment unless the architecture changes later

In other words: this plan is appropriate for a first Azure demo, not for durable production.

## Later Upgrade Path

When the repo grows past demo status, the next money well spent is:

1. persistent application data
2. durable photo storage
3. observability

The cheapest sane future path is likely:

- keep App Service for the web app
- move uploads to Blob Storage
- add a small managed database only after the in-memory stores are replaced

## Sources

- Azure App Service on Linux pricing: https://azure.microsoft.com/en-us/pricing/details/app-service/linux/
- Azure App Service Node.js quickstart: https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs
- Azure App Service file system behavior: https://learn.microsoft.com/en-us/azure/app-service/operating-system-functionality
- Azure Bandwidth pricing: https://azure.microsoft.com/en-us/pricing/details/bandwidth/
- Azure Static Web Apps pricing: https://azure.microsoft.com/en-us/pricing/details/app-service/static/
- Azure Communication Services pricing: https://azure.microsoft.com/en-us/pricing/details/communication-services

## Pricing Notes

- Azure pricing pages are live and can vary by region, offer type, and currency.
- On **2026-04-19**, Azure's official pricing page snippet showed **Basic B1 at about $39/month** in USD.
- Confirm the exact price in the Azure pricing calculator before purchase.
