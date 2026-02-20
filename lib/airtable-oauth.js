const crypto = require('crypto');
const axios = require('axios');
const { getAirtableTokens, setAirtableTokens } = require('./store');

const AUTHORIZE_URL = 'https://airtable.com/oauth2/v1/authorize';
const TOKEN_URL = 'https://airtable.com/oauth2/v1/token';

const SCOPES = ['data.records:read', 'data.records:write', 'schema.bases:read'];

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateState() {
  return crypto.randomBytes(16).toString('base64url');
}

function computeCodeChallenge(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return hash.toString('base64url');
}

function getAuthorizationUrl(redirectUri, state, codeChallenge) {
  const params = new URLSearchParams({
    client_id: process.env.AIRTABLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code, redirectUri, state, codeVerifier) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    state,
    code_verifier: codeVerifier,
  });
  const auth = Buffer.from(
    `${process.env.AIRTABLE_CLIENT_ID}:${process.env.AIRTABLE_CLIENT_SECRET}`
  ).toString('base64');

  const { data } = await axios.post(TOKEN_URL, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
  });

  const tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
  };
  setAirtableTokens(tokens);
  return tokens;
}

async function refreshAccessToken() {
  const stored = getAirtableTokens();
  if (!stored?.refresh_token) return null;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: stored.refresh_token,
  });
  const auth = Buffer.from(
    `${process.env.AIRTABLE_CLIENT_ID}:${process.env.AIRTABLE_CLIENT_SECRET}`
  ).toString('base64');

  const { data } = await axios.post(TOKEN_URL, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
  });

  const tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || stored.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
  };
  setAirtableTokens(tokens);
  return tokens;
}

async function getValidAccessToken() {
  const stored = getAirtableTokens();
  if (!stored) return null;
  if (stored.expires_at > Date.now() + 60 * 1000) return stored.access_token;
  const refreshed = await refreshAccessToken();
  return refreshed ? refreshed.access_token : null;
}

module.exports = {
  generateCodeVerifier,
  generateState,
  computeCodeChallenge,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getValidAccessToken,
  getAirtableTokens,
};
