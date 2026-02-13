const express = require('express');
const router = express.Router();
const { createAnonClient, createAuthenticatedClient } = require('../lib/supabase');

// --- Cookie options ---
const COOKIE_OPTS = {
  httpOnly: true,
  signed: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000 // 24h
};

// --- Auth middleware ---
const requireLogin = async (req, res, next) => {
  const accessToken = req.signedCookies.sb_access_token;
  const refreshToken = req.signedCookies.sb_refresh_token;

  if (!accessToken) {
    return res.redirect('/admin/login');
  }

  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (error || !data.session) {
      res.clearCookie('sb_access_token');
      res.clearCookie('sb_refresh_token');
      return res.redirect('/admin/login');
    }

    // Refresh cookies if tokens were refreshed
    if (data.session.access_token !== accessToken) {
      res.cookie('sb_access_token', data.session.access_token, COOKIE_OPTS);
      res.cookie('sb_refresh_token', data.session.refresh_token, COOKIE_OPTS);
    }

    req.supabase = createAuthenticatedClient(data.session.access_token, data.session.refresh_token);
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.redirect('/admin/login');
  }
};

// --- Routes ---

router.get('/', (req, res) => res.redirect('/admin/dashboard'));

router.get('/login', (req, res) => {
  res.render('admin/login', { title: '관리자 로그인', error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return res.render('admin/login', {
        title: '관리자 로그인',
        error: '이메일 또는 비밀번호가 틀렸습니다.'
      });
    }

    res.cookie('sb_access_token', data.session.access_token, COOKIE_OPTS);
    res.cookie('sb_refresh_token', data.session.refresh_token, COOKIE_OPTS);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    res.render('admin/login', { title: '관리자 로그인', error: '로그인 중 오류가 발생했습니다.' });
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('sb_access_token');
  res.clearCookie('sb_refresh_token');
  res.redirect('/admin/login');
});

// --- Dashboard ---
router.get('/dashboard', requireLogin, async (req, res) => {
  try {
    const supabase = req.supabase;
    const [colRes, nlRes, typesRes, projRes] = await Promise.all([
      supabase.from('columns').select('*').order('sort_order'),
      supabase.from('newsletters').select('*').order('created_at', { ascending: false }),
      supabase.from('gov_support_types').select('*').order('created_at', { ascending: false }),
      supabase.from('gov_projects').select('*').order('created_at', { ascending: false })
    ]);

    res.render('admin/dashboard', {
      title: '관리자 대시보드',
      posts: colRes.data || [],
      newsletters: nlRes.data || [],
      programTypes: typesRes.data || [],
      govProjects: projRes.data || []
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('admin/dashboard', {
      title: '관리자 대시보드',
      posts: [], newsletters: [], programTypes: [], govProjects: []
    });
  }
});

// --- Add ---
router.post('/add', requireLogin, async (req, res) => {
  const { type, title, url, date, period, agency, programs, description, category, image } = req.body;
  const supabase = req.supabase;

  try {
    switch (type) {
      case 'column': {
        // Get current max sort_order
        const { data: maxRow } = await supabase
          .from('columns')
          .select('sort_order')
          .order('sort_order', { ascending: false })
          .limit(1);
        const nextOrder = (maxRow && maxRow.length > 0) ? maxRow[0].sort_order + 1 : 0;

        await supabase.from('columns').insert({
          title,
          url,
          image: image || '',
          category: category || 'strategy',
          sort_order: nextOrder
        });
        break;
      }
      case 'newsletter':
        await supabase.from('newsletters').insert({ title, link: url, date });
        break;
      case 'govProject':
        await supabase.from('gov_projects').insert({ title, period, url });
        break;
      case 'programType':
        await supabase.from('gov_support_types').insert({ agency, programs, description, url });
        break;
    }
  } catch (err) {
    console.error('Add error:', err);
  }

  const tabMap = { column: 'tab-column', newsletter: 'tab-newsletter', govProject: 'tab-gov-support', programType: 'tab-gov-support' };
  res.redirect(`/admin/dashboard#${tabMap[type] || 'tab-column'}`);
});

// --- Delete ---
router.post('/delete', requireLogin, async (req, res) => {
  const { type, id } = req.body;
  const supabase = req.supabase;

  try {
    switch (type) {
      case 'column':
        await supabase.from('columns').delete().eq('id', id);
        break;
      case 'newsletter':
        await supabase.from('newsletters').delete().eq('id', id);
        break;
      case 'govProject':
        await supabase.from('gov_projects').delete().eq('id', id);
        break;
      case 'programType':
        await supabase.from('gov_support_types').delete().eq('id', id);
        break;
    }
  } catch (err) {
    console.error('Delete error:', err);
  }

  const tabMap = { column: 'tab-column', newsletter: 'tab-newsletter', govProject: 'tab-gov-support', programType: 'tab-gov-support' };
  res.redirect(`/admin/dashboard#${tabMap[type] || 'tab-column'}`);
});

module.exports = router;
