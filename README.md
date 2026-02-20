# Airtable ↔ eBay Connector

Sync listing data and photos from Airtable to eBay. Preview mapped data in the app, then push with one click.

## Phase 1.1 — Setup (current)

### 1. Clone / open project and install

```bash
cd airtable-ebay-connector
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

- **BASE_URL** — Full URL of your app (e.g. `http://localhost:3000` for local, or your Railway URL).
- **Airtable OAuth** — Create an OAuth app at [airtable.com/create/oauth](https://airtable.com/create/oauth). Set redirect URI to `{BASE_URL}/oauth/airtable/callback`. Put `AIRTABLE_CLIENT_ID` and `AIRTABLE_CLIENT_SECRET` in `.env`.
- **eBay OAuth** — Create an app at [developer.ebay.com](https://developer.ebay.com) → **Application Keys**. You must use a **RuName** (Redirect URL name), not a raw URL:
  1. Next to your App ID (Sandbox), click **User Tokens**.
  2. Under "Get a Token from eBay via Your Application", if you have no Redirect URLs, click **add one** and complete the form.
  3. Set **Auth Accepted URL** to `http://localhost:3000/oauth/ebay/callback` (or your app URL + `/oauth/ebay/callback`).
  4. Copy the **RuName** value eBay shows (a long string like `YourName-YourAp-SBX-xxxxx-xxxxx`). Put it in `.env` as **EBAY_REDIRECT_URI** (this is the RuName, not the URL).
  5. Put `EBAY_CLIENT_ID` (App ID) and `EBAY_CLIENT_SECRET` (Cert ID) in `.env`. Set `EBAY_ENVIRONMENT=sandbox` (or `production` when ready).

### 3. Run

```bash
npm start
```

Open `http://localhost:3000`. Use “Connect Airtable” and “Connect eBay” to authorize. Tokens are stored in `data/tokens.json`.

## Deploy to Railway

1. Create a new repo on GitHub (e.g. `airtable-ebay-connector`), then:
   ```bash
   cd airtable-ebay-connector
   git remote add origin https://github.com/YOUR_USERNAME/airtable-ebay-connector.git
   git push -u origin main
   ```
2. In [Railway](https://railway.app), **New Project** → **Deploy from GitHub repo** → select the repo.
3. In the service, go to **Variables** and add all env vars from `.env` (use your Railway URL for `BASE_URL` and `AIRTABLE_REDIRECT_URI`; `EBAY_REDIRECT_URI` stays as your RuName).
4. Update your Airtable and eBay OAuth apps to use the Railway callback URLs (see env vars above).
5. Redeploy if needed. Open the generated Railway URL to use the app.

**Note:** Tokens are stored in `data/tokens.json`. On Railway the filesystem is ephemeral, so tokens can be lost on redeploy. For production you’ll want to persist them (e.g. database or volume) later.

## Next (Phase 1.2+)

- Config and field-mapping UI
- Listings preview and Sync to eBay
