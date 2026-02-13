const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public (anon) client — for read-only public queries
function createAnonClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Authenticated client — uses access/refresh tokens from cookies
function createAuthenticatedClient(accessToken, refreshToken) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

module.exports = { createAnonClient, createAuthenticatedClient };
