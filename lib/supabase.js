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

// Server-only client (Supabase secret key) — for cron jobs that run without an admin login
function createServiceClient() {
  if (!process.env.SUPABASE_SECRET_KEY) throw new Error('SUPABASE_SECRET_KEY가 설정되지 않았습니다.');
  return createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

module.exports = { createAnonClient, createAuthenticatedClient, createServiceClient };
