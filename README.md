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

## Next (Phase 1.2+)

- Config and field-mapping UI
- Listings preview and Sync to eBay
