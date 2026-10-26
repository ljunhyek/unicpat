// 뉴스레터 직접 발송 (Resend)
// 관리자 화면이 sendNextBatch를 반복 호출해 조금씩 발송합니다 (Vercel 실행 시간 제한 대응).

const RESEND_API = 'https://api.resend.com';
const BATCH_SIZE = 50;            // Resend batch API 최대 100
const KST_OFFSET = 9 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEST_TOKEN = '00000000-0000-0000-0000-000000000000';   // 테스트 발송·미리보기용 수신거부 링크
const STATUSES =['pending', 'sending', 'sent', 'failed', 'skipped'];

const siteUrl = () => (process.env.SITE_URL || 'https://www.unicpat.com').replace(/\/$/, '');
const replyTo = () => process.env.NEWSLETTER_REPLY_TO || 'ljunhyek@naver.com';

function unsubscribeUrl(token) {
  return `${siteUrl()}/unsubscribe?t=${token}`;
}

// 정보통신망법: 광고성 메일은 제목 앞에 (광고)
function adSubject(subject) {
  const s = subject.trim();
  return s.startsWith('(광고)') ? s : `(광고) ${s}`;
}

// 정보통신망법: 21시~다음날 8시에는 광고성 메일 발송 금지
function isQuietHours(now = new Date()) {
  const hour = new Date(now.getTime() + KST_OFFSET).getUTCHours();
  return hour >= 21 || hour < 8;
}

// 본문의 {{unsubscribe_url}}을 개인별 링크로 치환. 없으면 하단에 수신거부 안내를 붙임
function personalize(html, token) {
  const url = unsubscribeUrl(token);
  if (html.includes('{{unsubscribe_url}}')) return html.split('{{unsubscribe_url}}').join(url);
  return `${html}
<p style="margin:16px auto;max-width:740px;font-size:12px;color:#586C72;text-align:center;font-family:Arial,sans-serif;">
본 메일은 발신전용이 아닙니다. 수신을 원하지 않으시면 <a href="${url}" style="color:#586C72;">수신거부</a>를 눌러 주세요.</p>`;
}

// 홈페이지 '지난 뉴스레터 보기'용: 개인별 수신거부 링크 대신 회신 메일로 안내
function archiveHtml(html) {
  return html.split('{{unsubscribe_url}}').join(`mailto:${replyTo()}?subject=unsubscribe`);
}

// 열람 확인용 1x1 이미지 (메일을 열어 이미지가 표시될 때 /nl/open.gif 요청이 기록됨)
function withOpenPixel(html, campaignId, token) {
  const pixel = `<img src="${siteUrl()}/nl/open.gif?c=${campaignId}&amp;t=${token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;">`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${pixel}</body>`) : html + pixel;
}

function buildMessage(campaign, email, token, subjectPrefix = '') {
  const url = unsubscribeUrl(token);
  const html = personalize(campaign.html, token);
  return {
    from: process.env.NEWSLETTER_FROM,
    to: [email],
    reply_to: replyTo(),
    subject: subjectPrefix + adSubject(campaign.subject),
    html: token === TEST_TOKEN ? html : withOpenPixel(html, campaign.id, token),
    headers: {
      'List-Unsubscribe': `<${url}>, <mailto:${replyTo()}?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  };
}

async function resend(pathname, body) {
  if (!process.env.RESEND_API_KEY) throw Object.assign(new Error('RESEND_API_KEY가 설정되지 않았습니다.'), { fatal: true });
  if (!process.env.NEWSLETTER_FROM) throw Object.assign(new Error('NEWSLETTER_FROM이 설정되지 않았습니다.'), { fatal: true });

  const headers = {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const res = await fetch(`${RESEND_API}${pathname}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.message || `Resend 오류 (HTTP ${res.status})`);
    err.status = res.status;
    // 인증/한도 초과는 계속 보내도 실패하므로 발송을 멈춤
    err.fatal = [401, 403, 429].includes(res.status) || res.status >= 500;
    throw err;
  }
  return json;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// --- 관리자 화면용 현황 ---
async function countRows(query) {
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

// 기본 발송 대상: 기업인증 기업 + 홈페이지에서 직접 구독 신청한 사람
const SIGNUP_SOURCE = 'website_signup';
const DEFAULT_TARGET_FILTER = `certification.not.is.null,source.eq.${SIGNUP_SOURCE}`;

async function getOverview(supabase) {
  const subs = () => supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true });
  const [total, active, certified, unsubscribed, campaignsRes, recentUnsubRes, signupsRes] = await Promise.all([
    countRows(subs()),
    countRows(subs().eq('status', 'active')),
    countRows(subs().eq('status', 'active').or(DEFAULT_TARGET_FILTER)),
    countRows(subs().eq('status', 'unsubscribed')),
    supabase.from('newsletter_campaigns')
      .select('id, subject, target, status, created_at, started_at, finished_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('newsletter_subscribers')
      .select('email, company_name, unsubscribed_at')
      .eq('status', 'unsubscribed')
      .order('unsubscribed_at', { ascending: false })
      .limit(10),
    // 홈페이지 구독 신청 중 아직 처리하지 않은 것 (구독 신청 SQL을 실행하기 전이면 error → 빈 목록)
    supabase.from('newsletter_signups')
      .select('id, created_at, name, company_name, email')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(100)
  ]);
  if (campaignsRes.error) throw campaignsRes.error;

  const campaigns = await Promise.all((campaignsRes.data || []).map(async c => ({
    ...c,
    counts: await getCounts(supabase, c.id),
    opened: await countOpened(supabase, c.id)
  })));

  return {
    subscribers: { total, active, certified, unsubscribed },
    campaigns,
    recentUnsubscribes: recentUnsubRes.data || [],
    signups: signupsRes.error ? null : signupsRes.data
  };
}

// 열람 수 (열람 확인 SQL을 실행하기 전이면 null)
async function countOpened(supabase, campaignId) {
  return countRows(supabase.from('newsletter_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .not('opened_at', 'is', null)).catch(() => null);
}

// 회차별 수신자 열람 현황 (발송 성공한 수신자만)
async function getOpens(supabase, campaignId) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('newsletter_recipients')
      .select('email, sent_at, opened_at, last_opened_at, open_count, subscriber:newsletter_subscribers(company_name, region)')
      .eq('campaign_id', campaignId)
      .eq('status', 'sent')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows.sort((a, b) => String(b.opened_at || '').localeCompare(String(a.opened_at || '')));
}

async function getCounts(supabase, campaignId) {
  const values = await Promise.all(STATUSES.map(status => countRows(
    supabase.from('newsletter_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', status)
  )));
  const counts = Object.fromEntries(STATUSES.map((s, i) => [s, values[i]]));
  counts.total = values.reduce((a, b) => a + b, 0);
  return counts;
}

// --- 발송 대상 확정: 조건에 맞는 구독자를 수신자 목록에 추가 (이미 있는 사람은 건너뜀) ---
async function prepareRecipients(supabase, campaign) {
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from('newsletter_subscribers')
      .select('id, email')
      .eq('status', 'active')
      .order('id')
      .range(from, from + PAGE - 1);
    if (campaign.target === 'certified') query = query.or(DEFAULT_TARGET_FILTER);

    const { data, error } = await query;
    if (error) throw error;
    if (!data.length) break;

    const rows = data.map(s => ({ campaign_id: campaign.id, subscriber_id: s.id, email: s.email }));
    const { error: insErr } = await supabase.from('newsletter_recipients')
      .upsert(rows, { onConflict: 'campaign_id,subscriber_id', ignoreDuplicates: true });
    if (insErr) throw insErr;
    if (data.length < PAGE) break;
  }
}

// Resend 무료 플랜은 한도를 넘겨도 거절하지 않으므로 직접 제한 (최근 24시간, 모든 회차 합계)
// ipbot1.com과 계정을 같이 쓰고 테스트 메일도 차감되므로 기본값은 100보다 조금 낮게
// windowHours: 자동 발송은 하루 한 번인데 Vercel Cron 실행 시각이 최대 1시간 정도 흔들리므로 더 짧은 창을 씀
async function remainingDailyQuota(supabase, windowHours = 24) {
  const limit = Number(process.env.NEWSLETTER_DAILY_LIMIT) || 90;
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const sent = await countRows(supabase.from('newsletter_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', since));
  return { limit, room: limit - sent };
}

// --- 다음 묶음 발송 ---
async function sendNextBatch(supabase, campaign, { windowHours } = {}) {
  const quota = await remainingDailyQuota(supabase, windowHours);
  if (quota.room <= 0) {
    throw new Error(`하루 발송 한도(${quota.limit}통)에 도달했습니다. 마지막 발송 후 24시간이 지나면 이어서 발송하세요.`);
  }

  const { data: next, error } = await supabase.from('newsletter_recipients')
    .select('id')
    .eq('campaign_id', campaign.id)
    .eq('status', 'pending')
    .order('id')
    .limit(Math.min(BATCH_SIZE, quota.room));
  if (error) throw error;

  if (next.length) {
    // pending → sending 으로 바뀐 행만 이 요청이 발송 (동시에 두 창에서 눌러도 중복 발송 방지)
    const { data: claimed, error: claimErr } = await supabase.from('newsletter_recipients')
      .update({ status: 'sending' })
      .in('id', next.map(r => r.id))
      .eq('status', 'pending')
      .select('id, email, subscriber:newsletter_subscribers(status, unsubscribe_token)');
    if (claimErr) throw claimErr;

    const sendable = claimed.filter(r => r.subscriber && r.subscriber.status === 'active');
    const skipped = claimed.filter(r => !sendable.includes(r));
    if (skipped.length) {
      await supabase.from('newsletter_recipients').update({ status: 'skipped' }).in('id', skipped.map(r => r.id));
    }

    if (sendable.length) {
      try {
        await deliver(supabase, campaign, sendable);
      } catch (err) {
        // 발송을 멈춰야 하는 오류: 이번 묶음은 다시 대기 상태로
        await supabase.from('newsletter_recipients').update({ status: 'pending' })
          .in('id', sendable.map(r => r.id)).eq('status', 'sending');
        throw err;
      }
    }
  }

  const counts = await getCounts(supabase, campaign.id);
  if (counts.pending === 0 && counts.sending === 0) {
    await supabase.from('newsletter_campaigns')
      .update({ status: 'done', finished_at: new Date().toISOString() })
      .eq('id', campaign.id);
  }
  return counts;
}

async function deliver(supabase, campaign, rows) {
  const messages = rows.map(r => buildMessage(campaign, r.email, r.subscriber.unsubscribe_token));
  const now = () => new Date().toISOString();

  try {
    const { data } = await resend('/emails/batch', messages);
    await Promise.all(rows.map((r, i) => supabase.from('newsletter_recipients')
      .update({ status: 'sent', resend_id: data && data[i] ? data[i].id : null, sent_at: now(), error: null })
      .eq('id', r.id)));
    return;
  } catch (err) {
    if (err.fatal) throw err;
    // 묶음 중 한 주소 때문에 전체가 거절된 경우: 한 통씩 다시 보내 실패한 주소만 골라냄
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const data = await resend('/emails', messages[i]);
      await supabase.from('newsletter_recipients')
        .update({ status: 'sent', resend_id: data.id, sent_at: now(), error: null }).eq('id', r.id);
    } catch (err) {
      if (err.fatal) throw err;
      await supabase.from('newsletter_recipients')
        .update({ status: 'failed', error: String(err.message).slice(0, 500) }).eq('id', r.id);
    }
    await sleep(550); // Resend 기본 초당 2건 제한
  }
}

// --- 자동 발송 (Vercel Cron, 하루 한 번) ---
// 관리자 화면에서 '발송 시작'한 회차(sending)만 이어서 보냄. 새 회차를 스스로 시작하지는 않음
async function sendScheduled(supabase) {
  if (isQuietHours()) return { skipped: 'quiet-hours' };

  const { data: campaigns, error } = await supabase.from('newsletter_campaigns')
    .select('*')
    .eq('status', 'sending')
    .order('started_at');
  if (error) throw error;

  const results = [];
  for (const campaign of campaigns) {
    // 한 번 호출에 최대 BATCH_SIZE통이므로 한도나 대기 수신자가 바닥날 때까지 반복
    for (let i = 0; i < 10; i++) {
      const { room } = await remainingDailyQuota(supabase, 20);
      if (room <= 0) return { results, limitReached: true };
      const counts = await sendNextBatch(supabase, campaign, { windowHours: 20 });
      if (counts.pending === 0) {
        results.push({ id: campaign.id, counts });
        break;
      }
      if (i === 9) results.push({ id: campaign.id, counts });
    }
  }
  return { results };
}

// --- 구독자 관리 화면 ---
// 사람별 발송·열람 기록 (모든 회차 합계)
// subscriber_id → { sent, lastSentAt, openedCampaigns, opens, lastOpenedAt }
async function getRecipientStats(supabase) {
  const PAGE = 1000;
  const stats = new Map();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('newsletter_recipients')
      .select('subscriber_id, sent_at, opened_at, last_opened_at, open_count')
      .eq('status', 'sent')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data) {
      const s = stats.get(r.subscriber_id) || { sent: 0, lastSentAt: null, openedCampaigns: 0, opens: 0, lastOpenedAt: null };
      s.sent += 1;
      if (r.sent_at && (!s.lastSentAt || r.sent_at > s.lastSentAt)) s.lastSentAt = r.sent_at;
      if (r.opened_at) {
        s.openedCampaigns += 1;
        s.opens += r.open_count || 0;
        const last = r.last_opened_at || r.opened_at;
        if (!s.lastOpenedAt || last > s.lastOpenedAt) s.lastOpenedAt = last;
      }
      stats.set(r.subscriber_id, s);
    }
    if (data.length < PAGE) break;
  }
  return stats;
}

// 회차별 발송·열람 기록 (현재 페이지에 보이는 구독자만)
async function getHistories(supabase, subscriberIds) {
  const histories = new Map();
  if (!subscriberIds.length) return histories;
  const { data, error } = await supabase.from('newsletter_recipients')
    .select('subscriber_id, status, sent_at, opened_at, open_count, campaign:newsletter_campaigns(subject)')
    .in('subscriber_id', subscriberIds)
    .order('id', { ascending: false });
  if (error) throw error;
  for (const r of data) {
    if (!histories.has(r.subscriber_id)) histories.set(r.subscriber_id, []);
    histories.get(r.subscriber_id).push({
      subject: r.campaign ? r.campaign.subject : '',
      status: r.status,
      sentAt: r.sent_at,
      openedAt: r.opened_at,
      opens: r.open_count || 0
    });
  }
  return histories;
}

// 구독자 목록
// filter = all | target(기본 발송 대상) | unsent(발송 대상 중 아직 한 통도 못 받은 사람) | unsubscribed | opened
// field = name | email
async function listSubscribers(supabase, { filter = 'all', field = 'name', q = '', page = 1, pageSize = 50 }) {
  const stats = await getRecipientStats(supabase);
  const term = q.replace(/[,()%*\\]/g, ' ').trim();
  const sub = () => supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true });

  // 쿼리 빌더는 호출할 때마다 조건이 누적되므로 매번 새로 만듦
  const buildQuery = (f = filter, withSearch = true) => {
    let query = supabase.from('newsletter_subscribers')
      .select('id, email, company_name, contact_name, ceo, certification, source, status, created_at, unsubscribed_at', { count: 'exact' });
    if (f === 'target' || f === 'unsent') query = query.eq('status', 'active').or(DEFAULT_TARGET_FILTER);
    if (f === 'unsubscribed') query = query.eq('status', 'unsubscribed');
    if (withSearch && term) {
      query = field === 'email'
        ? query.ilike('email', `%${term}%`)
        : query.or(`company_name.ilike.%${term}%,contact_name.ilike.%${term}%,ceo.ilike.%${term}%`);
    }
    return query;
  };

  // 조건에 맞는 구독자 전체 (화면에서 직접 걸러야 하는 '미발송' 목록용)
  const fetchAll = async (f, withSearch) => {
    const PAGE = 1000;
    const all = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await buildQuery(f, withSearch).order('id').range(from, from + PAGE - 1);
      if (error) throw error;
      all.push(...data);
      if (data.length < PAGE) break;
    }
    return all;
  };

  const [total, target, unsubscribed, targetRows] = await Promise.all([
    countRows(sub()),
    countRows(sub().eq('status', 'active').or(DEFAULT_TARGET_FILTER)),
    countRows(sub().eq('status', 'unsubscribed')),
    fetchAll('target', false)
  ]);
  const unsent = targetRows.filter(r => !stats.has(r.id)).length;
  const sentPeople = stats.size;
  const opened = [...stats.values()].filter(s => s.openedCampaigns > 0).length;

  let rows, count;
  if (filter === 'opened') {
    // 열어본 사람: 열람 기록이 있는 구독자만, 최근 열람순
    const ids = [...stats.entries()].filter(([, s]) => s.openedCampaigns > 0).map(([id]) => id);
    rows = [];
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await buildQuery().in('id', ids.slice(i, i + 200));
      if (error) throw error;
      rows.push(...data);
    }
    rows.sort((a, b) => String(stats.get(b.id).lastOpenedAt).localeCompare(String(stats.get(a.id).lastOpenedAt)));
    count = rows.length;
    rows = rows.slice((page - 1) * pageSize, page * pageSize);
  } else if (filter === 'unsent') {
    rows = (term ? await fetchAll('unsent', true) : targetRows).filter(r => !stats.has(r.id));
    count = rows.length;
    rows = rows.slice((page - 1) * pageSize, page * pageSize);
  } else {
    const { data, count: c, error } = await buildQuery()
      .order(filter === 'unsubscribed' ? 'unsubscribed_at' : 'id', { ascending: filter !== 'unsubscribed', nullsFirst: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    rows = data;
    count = c || 0;
  }

  const histories = await getHistories(supabase, rows.map(r => r.id));
  return {
    counts: { total, target, unsent, sentPeople, unsubscribed, opened },
    rows: rows.map(r => ({
      ...r,
      isTarget: r.status === 'active' && (!!r.certification || r.source === SIGNUP_SOURCE),
      stats: stats.get(r.id) || null,
      history: histories.get(r.id) || []
    })),
    count,
    pages: Math.max(1, Math.ceil(count / pageSize))
  };
}

// --- 홈페이지 구독 신청 ---
// 관리자에게 새 신청 알림 메일 (광고 메일이 아니라 내부 알림)
async function sendSignupNotice({ name, company, email }) {
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  await resend('/emails', {
    from: process.env.NEWSLETTER_FROM,
    to: [replyTo()],
    subject: `[유니크] 뉴스레터 구독 신청: ${String(name).slice(0, 50)}`,
    html: `<p>홈페이지에서 뉴스레터 구독 신청이 들어왔습니다.</p>
<ul><li>이름: ${esc(name)}</li><li>회사명: ${esc(company) || '-'}</li><li>이메일: ${esc(email)}</li></ul>
<p><a href="${siteUrl()}/admin/dashboard#tab-mailing">관리자 → 뉴스레터 발송</a>에서 발송 대상에 추가할 수 있습니다.</p>`
  });
}

// 구독 신청자를 발송 대상 고객 DB에 추가 (이미 있으면 수신 가능 상태로 되돌림)
async function addSignupToSubscribers(supabase, signup) {
  const email = signup.email.trim().toLowerCase();
  const { data: existing, error } = await supabase.from('newsletter_subscribers')
    .select('id, company_name, contact_name').eq('email', email).maybeSingle();
  if (error) throw error;

  if (existing) {
    const { error: upErr } = await supabase.from('newsletter_subscribers').update({
      status: 'active',
      unsubscribed_at: null,
      company_name: existing.company_name || signup.company_name,
      contact_name: existing.contact_name || signup.name
    }).eq('id', existing.id);
    if (upErr) throw upErr;
  } else {
    const { error: insErr } = await supabase.from('newsletter_subscribers').insert({
      email,
      company_name: signup.company_name,
      contact_name: signup.name,
      source: SIGNUP_SOURCE,
      status: 'active'
    });
    if (insErr) throw insErr;
  }
}

async function sendTest(campaign, emails) {
  for (const email of emails) {
    await resend('/emails', buildMessage(campaign, email, TEST_TOKEN, '[테스트] '));
    await sleep(550);
  }
}

module.exports = {
  UUID_RE,
  TEST_TOKEN,
  adSubject,
  isQuietHours,
  personalize,
  archiveHtml,
  getOverview,
  getOpens,
  prepareRecipients,
  sendNextBatch,
  sendScheduled,
  sendTest,
  sendSignupNotice,
  addSignupToSubscribers,
  listSubscribers
};
