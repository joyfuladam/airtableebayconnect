const express = require('express');
const router = express.Router();
const airtable = require('../lib/airtable-oauth');
const ebay = require('../lib/ebay-oauth');
const { getAirtableTokens, getEbayTokens } = require('../lib/store');

router.get('/airtable', (req, res) => {
  if (!process.env.AIRTABLE_CLIENT_ID || !process.env.AIRTABLE_CLIENT_SECRET) {
    return res.redirect('/?airtable_error=missing_credentials');
  }
  const redirectUri = process.env.AIRTABLE_REDIRECT_URI;
  const state = airtable.generateState();
  const codeVerifier = airtable.generateCodeVerifier();
  const codeChallenge = airtable.computeCodeChallenge(codeVerifier);
  const url = airtable.getAuthorizationUrl(redirectUri, state, codeChallenge);
  res.cookie('airtable_oauth', JSON.stringify({ state, codeVerifier }), {
    httpOnly: true,
    maxAge: 10 * 60 * 1000,
    sameSite: 'lax',
  });
  res.redirect(url);
});

router.get('/airtable/callback', async (req, res) => {
  const { code, error, error_description, state: queryState } = req.query;
  if (error) {
    const msg = error_description || error;
    res.clearCookie('airtable_oauth');
    return res.redirect(`/?airtable_error=${encodeURIComponent(msg)}`);
  }
  if (!code) {
    res.clearCookie('airtable_oauth');
    return res.redirect('/?airtable_error=no_code');
  }
  const redirectUri = process.env.AIRTABLE_REDIRECT_URI;
  if (!redirectUri) {
    res.clearCookie('airtable_oauth');
    return res.redirect('/?airtable_error=missing_redirect_uri');
  }
  let stored;
  try {
    stored = JSON.parse(req.cookies?.airtable_oauth || '{}');
  } catch {
    stored = {};
  }
  const { state: storedState, codeVerifier } = stored;
  res.clearCookie('airtable_oauth');
  if (!queryState || queryState !== storedState || !codeVerifier) {
    return res.redirect('/?airtable_error=invalid_state_or_missing_verifier');
  }
  try {
    await airtable.exchangeCodeForTokens(code, redirectUri, queryState, codeVerifier);
    res.redirect('/?airtable=ok');
  } catch (err) {
    const message = err.response?.data?.error_description || err.response?.data?.error || err.message;
    console.error('Airtable token exchange failed:', err.response?.data || err.message);
    res.redirect(`/?airtable_error=${encodeURIComponent(message)}`);
  }
});

router.get('/ebay', (req, res) => {
  const missing = [];
  if (!process.env.EBAY_CLIENT_ID) missing.push('EBAY_CLIENT_ID');
  if (!process.env.EBAY_CLIENT_SECRET) missing.push('EBAY_CLIENT_SECRET');
  if (!process.env.EBAY_REDIRECT_URI) missing.push('EBAY_REDIRECT_URI');
  if (missing.length) {
    return res.redirect(`/?ebay_error=${encodeURIComponent('Missing in .env: ' + missing.join(', '))}`);
  }
  try {
    const url = ebay.getAuthorizationUrl();
    res.redirect(url);
  } catch (err) {
    res.redirect(`/?ebay_error=${encodeURIComponent(err.message)}`);
  }
});

router.get('/ebay/callback', async (req, res, next) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect(`/?ebay_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return res.redirect('/?ebay_error=no_code');
  }
  try {
    await ebay.exchangeCodeForTokens(code);
    res.redirect('/?ebay=ok');
  } catch (err) {
    next(err);
  }
});

router.get('/status', (req, res) => {
  const airtableTokens = getAirtableTokens();
  const ebayTokens = getEbayTokens();
  res.json({
    airtable: !!airtableTokens?.access_token,
    ebay: !!ebayTokens?.access_token,
  });
});

module.exports = router;
