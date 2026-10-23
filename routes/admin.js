const express = require('express');
const router = express.Router();
const { createAnonClient, createAuthenticatedClient } = require('../lib/supabase');
const { sortByDateDesc } = require('../lib/sort');
const { getVisitStats } = require('../lib/analytics');
const mailer = require('../lib/newsletter-mailer');

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
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const [colRes, nlRes, typesRes, projRes, stats, mailing] = await Promise.all([
      supabase.from('columns').select('*').order('sort_order'),
      supabase.from('newsletters').select('*'),
      supabase.from('gov_support_types').select('*').order('created_at', { ascending: false }),
      supabase.from('gov_projects').select('*').order('created_at', { ascending: false }),
      getVisitStats(supabase, days).catch(err => {
        console.error('Visit stats error:', err.message || err);
        return null;
      }),
      mailer.getOverview(supabase).catch(err => {
        console.error('Mailing overview error:', err.message || err);
        return null;
      })
    ]);

    res.render('admin/dashboard', {
      title: '관리자 대시보드',
      posts: colRes.data || [],
      newsletters: sortByDateDesc(nlRes.data || []),
      programTypes: typesRes.data || [],
      govProjects: projRes.data || [],
      stats,
      mailing
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('admin/dashboard', {
      title: '관리자 대시보드',
      posts: [], newsletters: [], programTypes: [], govProjects: [], stats: null, mailing: null
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

// --- Newsletter mailing (뉴스레터 발송 탭) ---
const MAIL_TAB = '/admin/dashboard#tab-mailing';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function loadCampaign(req, res, next) {
  const { data, error } = await req.supabase
    .from('newsletter_campaigns').select('*').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: '발송 회차를 찾을 수 없습니다.' });
  req.campaign = data;
  next();
}

router.post('/mail/campaigns', requireLogin, async (req, res) => {
  const { subject, html, target } = req.body;
  if (subject && html) {
    const { error } = await req.supabase.from('newsletter_campaigns').insert({
      subject: subject.trim(),
      html,
      target: target === 'all' ? 'all' : 'certified'
    });
    if (error) console.error('Campaign create error:', error);
  }
  res.redirect(MAIL_TAB);
});

router.post('/mail/campaigns/:id/delete', requireLogin, loadCampaign, async (req, res) => {
  // 발송을 시작한 회차는 기록 보존을 위해 삭제하지 않음
  if (req.campaign.status === 'draft') {
    await req.supabase.from('newsletter_campaigns').delete().eq('id', req.campaign.id);
  }
  res.redirect(MAIL_TAB);
});

router.get('/mail/campaigns/:id/preview', requireLogin, loadCampaign, (req, res) => {
  const html = mailer.personalize(req.campaign.html, '00000000-0000-0000-0000-000000000000');
  res.type('html').send(`<!doctype html><meta charset="utf-8"><title>${mailer.adSubject(req.campaign.subject).replace(/</g, '&lt;')}</title>${html}`);
});

router.post('/mail/campaigns/:id/test', requireLogin, loadCampaign, async (req, res) => {
  const emails = String(req.body.emails || '').split(/[\s,;]+/).filter(Boolean);
  if (!emails.length || emails.length > 5 || !emails.every(e => EMAIL_RE.test(e))) {
    return res.status(400).json({ error: '테스트 받을 이메일을 1~5개 입력하세요.' });
  }
  try {
    await mailer.sendTest(req.campaign, emails);
    res.json({ ok: true });
  } catch (err) {
    console.error('Test send error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/mail/campaigns/:id/send-batch', requireLogin, loadCampaign, async (req, res) => {
  const campaign = req.campaign;
  if (mailer.isQuietHours()) {
    return res.status(400).json({ error: '광고성 메일은 21시~다음날 8시에 보낼 수 없습니다 (정보통신망법). 8시 이후에 이어서 발송하세요.' });
  }
  try {
    if (campaign.status === 'draft') {
      await mailer.prepareRecipients(req.supabase, campaign);
      await req.supabase.from('newsletter_campaigns')
        .update({ status: 'sending', started_at: new Date().toISOString() })
        .eq('id', campaign.id);
    }
    const counts = await mailer.sendNextBatch(req.supabase, campaign);
    res.json({ counts });
  } catch (err) {
    console.error('Send batch error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

router.post('/mail/campaigns/:id/retry-failed', requireLogin, loadCampaign, async (req, res) => {
  await req.supabase.from('newsletter_recipients')
    .update({ status: 'pending', error: null })
    .eq('campaign_id', req.campaign.id)
    .eq('status', 'failed');
  await req.supabase.from('newsletter_campaigns').update({ status: 'sending' }).eq('id', req.campaign.id);
  res.redirect(MAIL_TAB);
});

router.get('/mail/campaigns/:id/failures', requireLogin, loadCampaign, async (req, res) => {
  const { data } = await req.supabase.from('newsletter_recipients')
    .select('email, error')
    .eq('campaign_id', req.campaign.id)
    .eq('status', 'failed')
    .order('id');
  res.json({ failures: data || [] });
});

// 회신 등으로 받은 수신거부를 직접 처리
router.post('/mail/subscribers/status', requireLogin, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const status = req.body.status === 'active' ? 'active' : 'unsubscribed';
  const { data, error } = await req.supabase.from('newsletter_subscribers')
    .update({ status, unsubscribed_at: status === 'active' ? null : new Date().toISOString() })
    .eq('email', email)
    .select('email');
  if (error) return res.status(500).json({ error: error.message });
  if (!data.length) return res.status(404).json({ error: `${email} 주소가 고객 DB에 없습니다.` });
  res.json({ ok: true, status });
});

module.exports = router;
