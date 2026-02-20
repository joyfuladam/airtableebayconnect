const EbayAuthToken = require('ebay-oauth-nodejs-client');
const { getEbayTokens, setEbayTokens } = require('./store');

const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/commerce.media.upload',
];

function getClient() {
  const env = process.env.EBAY_ENVIRONMENT === 'production' ? 'PRODUCTION' : 'SANDBOX';
  return new EbayAuthToken({
    clientId: process.env.EBAY_CLIENT_ID,
    clientSecret: process.env.EBAY_CLIENT_SECRET,
    redirectUri: process.env.EBAY_REDIRECT_URI,
    env,
  });
}

function getAuthorizationUrl(state = 'ebay') {
  const client = getClient();
  const env = process.env.EBAY_ENVIRONMENT === 'production' ? 'PRODUCTION' : 'SANDBOX';
  return client.generateUserAuthorizationUrl(env, EBAY_SCOPES, { state });
}

async function exchangeCodeForTokens(code) {
  const client = getClient();
  const env = process.env.EBAY_ENVIRONMENT === 'production' ? 'PRODUCTION' : 'SANDBOX';
  const token = await client.exchangeCodeForAccessToken(env, code);
  const parsed = typeof token === 'string' ? JSON.parse(token) : token;
  const tokens = {
    access_token: parsed.access_token,
    refresh_token: parsed.refresh_token,
    expires_at: Date.now() + (parsed.expires_in || 7200) * 1000,
  };
  setEbayTokens(tokens);
  return tokens;
}

async function refreshAccessToken() {
  const stored = getEbayTokens();
  if (!stored?.refresh_token) return null;

  const client = getClient();
  const env = process.env.EBAY_ENVIRONMENT === 'production' ? 'PRODUCTION' : 'SANDBOX';
  const token = await client.getAccessToken(env, stored.refresh_token, EBAY_SCOPES);
  const parsed = typeof token === 'string' ? JSON.parse(token) : token;
  const tokens = {
    access_token: parsed.access_token,
    refresh_token: parsed.refresh_token || stored.refresh_token,
    expires_at: Date.now() + (parsed.expires_in || 7200) * 1000,
  };
  setEbayTokens(tokens);
  return tokens;
}

async function getValidAccessToken() {
  const stored = getEbayTokens();
  if (!stored) return null;
  if (stored.expires_at > Date.now() + 60 * 1000) return stored.access_token;
  const refreshed = await refreshAccessToken();
  return refreshed ? refreshed.access_token : null;
}

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getValidAccessToken,
  getEbayTokens,
};
