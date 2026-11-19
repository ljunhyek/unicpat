const express = require('express');
const router = express.Router();
const { createAnonClient, createAuthenticatedClient } = require('../lib/supabase');
const { getVisitStats } = require('../lib/analytics');
const mailer = require('../lib/newsletter-mailer');
const { blogPostNo } = require('../lib/columns');
const blogImport = require('../lib/blog-import');
const { columnPostLocals, loadNewsletters } = require('./pages');
const { parseNewsletterHtml, toSendHtml } = require('../lib/newsletter-import');
const crypto = require('crypto');
const { analyzeSubscribers } = require('../lib/subscriber-analysis');
const { planTrim, applyTrim, restorePaused } = require('../lib/subscriber-trim');
const indexNow = require('../lib/indexnow');
const automation = require('../lib/automation');

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
    const [colRes, nlRes, typesRes, projRes, stats, mailing, auto] = await Promise.all([
      supabase.from('columns').select('*').order('sort_order'),
      loadNewsletters(),
      supabase.from('gov_support_types').select('*').order('created_at', { ascending: false }),
      supabase.from('gov_projects').select('*').order('created_at', { ascending: false }),
      getVisitStats(supabase, days).catch(err => {
        console.error('Visit stats error:', err.message || err);
        return null;
      }),
      mailer.getOverview(supabase).catch(err => {
        console.error('Mailing overview error:', err.message || err);
        return null;
      }),
      automation.getOverview(supabase).catch(err => {
        console.error('Automation overview error:', err.message || err);
        return { setupNeeded: true, error: err.message || String(err) };
      })
    ]);

    res.render('admin/dashboard', {
      title: '관리자 대시보드',
      posts: colRes.data || [],
      newsletters: nlRes,
      programTypes: typesRes.data || [],
      govProjects: projRes.data || [],
      stats,
      mailing,
      automation: auto
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('admin/dashboard', {
      title: '관리자 대시보드',
      posts: [], newsletters: [], programTypes: [], govProjects: [], stats: null, mailing: null,
      automation: { setupNeeded: true, error: err.message || String(err) }
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
      case 'newsletter': {
        // 다른 곳에서 만든 뉴스레터 HTML 파일을 올리면 제목·발행일을 읽어 목록에 추가 (직접 입력하면 그 값을 사용)
        const html = String(req.body.html || '');
        if (!html.trim()) break;
        const parsed = parseNewsletterHtml(html);
        const id = crypto.randomUUID();
        const { error } = await supabase.from('newsletters').insert({
          id,
          title: (title || '').trim() || parsed.title || '유니크 뉴스레터',
          date: (date || '').trim() || parsed.date,
          link: `/newsletter/${id}`,
          html
        });
        if (error) console.error('Newsletter upload error:', error);
        else indexNow.notifyInBackground([`/newsletter/${id}`, '/newsletter']);
        break;
      }
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

// --- 칼럼 요약 (홈페이지 /column/글번호 페이지) ---
async function loadColumn(req, res, next) {
  const { data, error } = await req.supabase.from('columns').select('*').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).send('칼럼을 찾을 수 없습니다.');
  req.column = data;
  next();
}

router.get('/columns/:id/summary', requireLogin, loadColumn, (req, res) => {
  res.render('admin/column-summary', {
    title: '칼럼 요약 편집 - 관리자',
    post: req.column,
    postNo: blogPostNo(req.column.url),
    saved: req.query.saved === '1'
  });
});

router.post('/columns/:id/summary', requireLogin, loadColumn, async (req, res) => {
  const { summary, key_points, checkpoint, published_on, category } = req.body;
  const text = name => (req.body[name] || '').trim() || null;
  const ready = req.body.summary_ready === '1' && !!blogPostNo(req.column.url) && !!(summary || '').trim();
  const { error } = await req.supabase.from('columns').update({
    category: ['strategy', 'patent', 'trademark'].includes(category) ? category : req.column.category,
    summary: (summary || '').trim() || null,
    key_points: (key_points || '').trim() || null,
    checkpoint: (checkpoint || '').trim() || null,
    title_en: text('title_en'),
    summary_en: text('summary_en'),
    key_points_en: text('key_points_en'),
    checkpoint_en: text('checkpoint_en'),
    // faq 칸은 column_faq_1.sql을 실행한 뒤에만 저장 (칸이 없을 때 저장 오류가 나지 않도록)
    ...('faq' in req.column ? { faq: text('faq') } : {}),
    published_on: published_on || null,
    summary_ready: ready
  }).eq('id', req.column.id);
  if (error) {
    console.error('Column summary save error:', error);
    return res.status(500).send(`저장하지 못했습니다: ${error.message}`);
  }
  // 공개된 글을 저장하면(새로 공개하거나 내용을 고친 경우) 네이버·Bing에 알림
  if (ready) indexNow.notifyInBackground([`/column/${blogPostNo(req.column.url)}`]);
  res.redirect(`/admin/columns/${req.column.id}/summary?saved=1`);
});

// --- 블로그에서 글 가져오기 ---
// 블로그 RSS 중 아직 칼럼에 없는 글
router.get('/columns/blog/new', requireLogin, async (req, res) => {
  try {
    // 마지막으로 등록한 글보다 나중에 쓴 글만
    res.json({ posts: await blogImport.findNewPosts(req.supabase) });
  } catch (err) {
    console.error('Blog feed error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 블로그 글 1개를 칼럼에 추가 (제목·주소·카테고리·발행일 자동 입력, 목록 맨 앞에 배치)
router.post('/columns/blog/import', requireLogin, async (req, res) => {
  try {
    const no = String(req.body.no || '');
    const post = (await blogImport.fetchBlogFeed()).find(p => p.no === no);
    if (!post) return res.status(404).json({ error: '블로그 RSS에서 해당 글을 찾지 못했습니다.' });
    const { id } = await blogImport.importPost(req.supabase, post);
    res.json({ id });
  } catch (err) {
    console.error('Blog import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 칼럼 관리 표의 체크박스: 공개 여부만 바로 저장
router.post('/columns/:id/publish', requireLogin, loadColumn, async (req, res) => {
  const ready = req.body.ready === true;
  if (ready && !(req.column.summary && blogPostNo(req.column.url))) {
    return res.status(400).json({ error: '요약이 없거나 블로그 주소 형식이 맞지 않아 공개할 수 없습니다.' });
  }
  const { error } = await req.supabase.from('columns').update({ summary_ready: ready }).eq('id', req.column.id);
  if (error) return res.status(500).json({ error: error.message });
  if (ready && !req.column.summary_ready) indexNow.notifyInBackground([`/column/${blogPostNo(req.column.url)}`, '/column']);
  res.json({ ready });
});

// 공개 전에도 볼 수 있는 미리보기
router.get('/columns/:id/preview', requireLogin, loadColumn, (req, res) => {
  // ?lang=en 이면 영어 화면으로 미리보기
  if (req.query.lang === 'en') res.locals.lang = 'en';
  res.render('column-post', { ...columnPostLocals(req.column, [], res.locals.lang), preview: true });
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

// 뉴스레터 관리에 올린 HTML로 발송 회차 만들기
// 파일 안에 들어 있는 이미지는 홈페이지 주소(/newsletter/<id>/img/<번호>)로 바꿔 발송용 HTML로 저장
router.post('/newsletter/:id/to-campaign', requireLogin, async (req, res) => {
  const { data: nl, error } = await req.supabase.from('newsletters').select('id, title, html').eq('id', req.params.id).maybeSingle();
  if (error || !nl || !nl.html) {
    if (error) console.error('Newsletter to campaign error:', error);
    return res.redirect('/admin/dashboard#tab-newsletter');
  }
  const html = toSendHtml(nl.html, n => `${mailer.siteUrl()}/newsletter/${nl.id}/img/${n}`);
  const { error: insertError } = await req.supabase.from('newsletter_campaigns').insert({
    subject: nl.title,
    html,
    target: 'all'
  });
  if (insertError) console.error('Campaign create error:', insertError);
  res.redirect(MAIL_TAB);
});

router.post('/mail/campaigns', requireLogin, async (req, res) => {
  const { html, target } = req.body;
  // 제목을 비워 두면 HTML에서 읽은 제목을 사용
  const subject = (req.body.subject || '').trim() || (html ? parseNewsletterHtml(html).title : '');
  if (subject && html) {
    const { error } = await req.supabase.from('newsletter_campaigns').insert({
      subject,
      html,
      target: target === 'all' ? 'all' : 'certified'
    });
    if (error) console.error('Campaign create error:', error);
  }
  res.redirect(MAIL_TAB);
});

// 발송 전 회차의 발송 대상 변경 (all: 수신 가능 전체·보류 제외 / certified: 기업인증 기업 + 구독 신청자)
router.post('/mail/campaigns/:id/target', requireLogin, loadCampaign, async (req, res) => {
  if (req.campaign.status === 'draft') {
    const target = req.body.target === 'certified' ? 'certified' : 'all';
    const { error } = await req.supabase.from('newsletter_campaigns').update({ target }).eq('id', req.campaign.id);
    if (error) console.error('Campaign target error:', error);
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
  const html = mailer.personalize(req.campaign.html, mailer.TEST_TOKEN);
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
  // 14시 이후(또는 야간)에 처음 시작하면 수신자만 준비해 두고 다음 날 오전 10시 자동 발송부터 보냄
  if (campaign.status === 'draft' && mailer.startsTomorrow()) {
    try {
      await mailer.prepareRecipients(req.supabase, campaign);
      await req.supabase.from('newsletter_campaigns')
        .update({ status: 'sending', started_at: new Date().toISOString() })
        .eq('id', campaign.id);
      const counts = await mailer.getCounts(req.supabase, campaign.id);
      return res.json({ counts, scheduled: true });
    } catch (err) {
      console.error('Schedule campaign error:', err);
      return res.status(500).json({ error: err.message || String(err) });
    }
  }
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

// 회차별 열람 현황 페이지
router.get('/mail/campaigns/:id/opens', requireLogin, loadCampaign, async (req, res) => {
  try {
    const rows = await mailer.getOpens(req.supabase, req.campaign.id);
    const filter = ['opened', 'unopened'].includes(req.query.f) ? req.query.f : 'all';
    res.render('admin/newsletter-opens', {
      title: '열람 현황 - 관리자',
      campaign: req.campaign,
      total: rows.length,
      opened: rows.filter(r => r.opened_at).length,
      filter,
      rows: filter === 'all' ? rows : rows.filter(r => (filter === 'opened') === !!r.opened_at),
      error: null
    });
  } catch (err) {
    console.error('Opens page error:', err);
    res.render('admin/newsletter-opens', {
      title: '열람 현황 - 관리자', campaign: req.campaign, total: 0, opened: 0, filter: 'all', rows: [],
      error: '열람 기록을 불러오지 못했습니다. Supabase SQL Editor에서 newsletter_mailing.sql의 "열람 확인" 부분을 실행했는지 확인하세요.'
    });
  }
});

// 구독자 현황 분석 (업종·기업인증·지역·규모·열람 여부별 인원, 발송 대상 정리용)
router.get('/mail/subscribers/analysis', requireLogin, async (req, res) => {
  try {
    const result = await analyzeSubscribers(req.supabase);
    res.render('admin/newsletter-analysis', { title: '구독자 현황 분석 - 관리자', ...result, error: null });
  } catch (err) {
    console.error('Subscriber analysis error:', err);
    res.render('admin/newsletter-analysis', {
      title: '구독자 현황 분석 - 관리자', total: 0, statusCounts: {}, activeCount: 0, openedCount: 0,
      duplicateExtra: 0, duplicateCompanies: 0, sections: [], error: err.message || String(err)
    });
  }
});

// 발송 대상 정리: 목표 인원만 남기고 나머지는 보류 (미리보기 → 적용)
function trimTarget(value) {
  const n = parseInt(value, 10);
  return n >= 100 && n <= 100000 ? n : 1500;
}

router.get('/mail/subscribers/trim', requireLogin, async (req, res) => {
  const target = trimTarget(req.query.target);
  try {
    const [plan, paused] = await Promise.all([
      planTrim(req.supabase, target),
      req.supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('status', 'paused')
    ]);
    res.render('admin/newsletter-trim', {
      title: '발송 대상 정리 - 관리자', plan, pausedCount: paused.count || 0, done: req.query.done || null, error: null
    });
  } catch (err) {
    console.error('Trim plan error:', err);
    res.render('admin/newsletter-trim', {
      title: '발송 대상 정리 - 관리자', plan: null, pausedCount: 0, done: null, error: err.message || String(err)
    });
  }
});

router.post('/mail/subscribers/trim', requireLogin, async (req, res) => {
  const target = trimTarget(req.body.target);
  try {
    const plan = await applyTrim(req.supabase, target);
    res.redirect(`/admin/mail/subscribers/trim?target=${target}&done=paused-${plan.pauseIds.length}`);
  } catch (err) {
    console.error('Trim apply error:', err);
    res.status(500).send(`정리하지 못했습니다: ${err.message}. supabase/newsletter_paused.sql을 실행했는지 확인하세요.`);
  }
});

router.post('/mail/subscribers/restore-paused', requireLogin, async (req, res) => {
  try {
    const n = await restorePaused(req.supabase);
    res.redirect(`/admin/mail/subscribers/trim?done=restored-${n}`);
  } catch (err) {
    console.error('Restore paused error:', err);
    res.status(500).send(`되돌리지 못했습니다: ${err.message}`);
  }
});

// 구독자 관리 화면 (발송 대상 / 수신거부 / 반송·신고 / 열어본 사람 / 안 열어본 사람, 이름·이메일 검색)
router.get('/mail/subscribers', requireLogin, async (req, res) => {
  const filter = ['all', 'target', 'unsent', 'unsubscribed', 'bounced', 'paused', 'opened', 'unopened'].includes(req.query.f) ? req.query.f : 'all';
  const field = req.query.field === 'email' ? 'email' : 'name';
  const q = String(req.query.q || '').slice(0, 100);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  try {
    const result = await mailer.listSubscribers(req.supabase, { filter, field, q, page });
    res.render('admin/newsletter-subscribers', { title: '구독자 관리 - 관리자', filter, field, q, page, ...result, error: null });
  } catch (err) {
    console.error('Subscribers page error:', err);
    res.render('admin/newsletter-subscribers', {
      title: '구독자 관리 - 관리자', filter, field, q, page,
      counts: { total: 0, target: 0, unsent: 0, sentPeople: 0, unsubscribed: 0, bounced: 0, paused: 0, opened: 0, unopened: 0 }, rows: [], count: 0, pages: 1,
      error: `구독자 목록을 불러오지 못했습니다: ${err.message}`
    });
  }
});

// 홈페이지 구독 신청 처리: 발송 대상에 추가 / 제외
async function loadSignup(req, res, next) {
  const { data, error } = await req.supabase.from('newsletter_signups').select('*').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).send('구독 신청을 찾을 수 없습니다.');
  req.signup = data;
  next();
}

router.post('/mail/signups/:id/add', requireLogin, loadSignup, async (req, res) => {
  try {
    await mailer.addSignupToSubscribers(req.supabase, req.signup);
    await req.supabase.from('newsletter_signups')
      .update({ status: 'added', handled_at: new Date().toISOString() }).eq('id', req.signup.id);
  } catch (err) {
    console.error('Signup add error:', err);
    return res.status(500).send(`발송 대상에 추가하지 못했습니다: ${err.message}`);
  }
  res.redirect(MAIL_TAB);
});

router.post('/mail/signups/:id/dismiss', requireLogin, loadSignup, async (req, res) => {
  await req.supabase.from('newsletter_signups')
    .update({ status: 'dismissed', handled_at: new Date().toISOString() }).eq('id', req.signup.id);
  res.redirect(MAIL_TAB);
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

// --- 자동화 탭 (lib/automation.js) ---
const AUTO_TAB = '/admin/dashboard#tab-automation';

// [지금 실행]: 날짜 조건 없이 바로 실행
router.post('/automation/run/:job', requireLogin, async (req, res) => {
  if (!automation.JOBS[req.params.job]) return res.status(404).json({ error: '알 수 없는 작업입니다.' });
  const result = await automation.runJob(req.supabase, req.params.job, { force: true });
  res.status(result.ok ? 200 : 500).json(result);
});

// 할 일 처리 완료 / 제외
router.post('/automation/tasks/:id/status', requireLogin, async (req, res) => {
  const status = req.body.status === 'dismissed' ? 'dismissed' : 'done';
  const { error } = await req.supabase.from('automation_tasks')
    .update({ status, handled_at: new Date().toISOString() }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, status });
});

// 정부지원사업 후보 → 홈페이지 '사업 공고'로 추가
router.post('/automation/gov/:id/add', requireLogin, async (req, res) => {
  const { data: cand, error } = await req.supabase.from('gov_candidates').select('*').eq('id', req.params.id).maybeSingle();
  if (error || !cand) return res.status(404).json({ error: '후보를 찾을 수 없습니다.' });
  const title = String(req.body.title || cand.title).trim();
  const period = String(req.body.period || cand.period || '').trim();
  if (!period) return res.status(400).json({ error: '접수기간을 입력하세요 (예: 2026.11.20 ~ 2026.12.10). 공고 링크에서 확인할 수 있습니다.' });
  const { error: insErr } = await req.supabase.from('gov_projects').insert({ title, period, url: cand.url });
  if (insErr) return res.status(500).json({ error: insErr.message });
  await req.supabase.from('gov_candidates').update({ status: 'added', period }).eq('id', cand.id);
  indexNow.notifyInBackground(['/gov-support']);
  res.json({ ok: true });
});

router.post('/automation/gov/:id/dismiss', requireLogin, async (req, res) => {
  const { error } = await req.supabase.from('gov_candidates').update({ status: 'dismissed' }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// 게시글 초안: 직접 새로 쓰기
router.post('/automation/social', requireLogin, async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body) return res.redirect(AUTO_TAB);
  const { error } = await req.supabase.from('social_posts').insert({
    title: String(req.body.title || '').trim() || body.slice(0, 30),
    body: body.slice(0, 1500),
    link_url: String(req.body.link_url || '').trim() || null,
    image_path: String(req.body.image_path || '').trim() || null
  });
  if (error) console.error('Social post create error:', error);
  res.redirect(AUTO_TAB);
});

// 게시글 초안: 수정·승인
router.post('/automation/social/:id', requireLogin, async (req, res) => {
  const update = {
    body: String(req.body.body || '').trim().slice(0, 1500),
    link_url: String(req.body.link_url || '').trim() || null,
    image_path: String(req.body.image_path || '').trim() || null
  };
  if (!update.body) return res.status(400).json({ error: '본문이 비어 있습니다.' });
  if (req.body.approve === true) update.status = 'approved';
  const { error } = await req.supabase.from('social_posts').update(update).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// 게시글: 채널별 게시 완료 표시 (구글·네이버 둘 다 끝나면 '게시됨')
router.post('/automation/social/:id/posted', requireLogin, async (req, res) => {
  const field = req.body.channel === 'naver' ? 'naver_posted_at' : 'gbp_posted_at';
  const { data: post, error } = await req.supabase.from('social_posts').select('*').eq('id', req.params.id).maybeSingle();
  if (error || !post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
  const update = { [field]: new Date().toISOString() };
  const other = field === 'gbp_posted_at' ? post.naver_posted_at : post.gbp_posted_at;
  if (other) update.status = 'posted';
  const { error: e } = await req.supabase.from('social_posts').update(update).eq('id', post.id);
  if (e) return res.status(500).json({ error: e.message });
  res.json({ ok: true, posted: !!update.status });
});

router.post('/automation/social/:id/delete', requireLogin, async (req, res) => {
  const { error } = await req.supabase.from('social_posts').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
