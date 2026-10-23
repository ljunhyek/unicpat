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

function buildMessage(campaign, email, token, subjectPrefix = '') {
  const url = unsubscribeUrl(token);
  return {
    from: process.env.NEWSLETTER_FROM,
    to: [email],
    reply_to: replyTo(),
    subject: subjectPrefix + adSubject(campaign.subject),
    html: personalize(campaign.html, token),
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

async function getOverview(supabase) {
  const subs = () => supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true });
  const [total, active, certified, unsubscribed, campaignsRes, recentUnsubRes] = await Promise.all([
    countRows(subs()),
    countRows(subs().eq('status', 'active')),
    countRows(subs().eq('status', 'active').not('certification', 'is', null)),
    countRows(subs().eq('status', 'unsubscribed')),
    supabase.from('newsletter_campaigns')
      .select('id, subject, target, status, created_at, started_at, finished_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('newsletter_subscribers')
      .select('email, company_name, unsubscribed_at')
      .eq('status', 'unsubscribed')
      .order('unsubscribed_at', { ascending: false })
      .limit(10)
  ]);
  if (campaignsRes.error) throw campaignsRes.error;

  const campaigns = await Promise.all((campaignsRes.data || []).map(async c => ({
    ...c,
    counts: await getCounts(supabase, c.id)
  })));

  return {
    subscribers: { total, active, certified, unsubscribed },
    campaigns,
    recentUnsubscribes: recentUnsubRes.data || []
  };
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
    if (campaign.target === 'certified') query = query.not('certification', 'is', null);

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

// --- 다음 묶음 발송 ---
async function sendNextBatch(supabase, campaign) {
  const { data: next, error } = await supabase.from('newsletter_recipients')
    .select('id')
    .eq('campaign_id', campaign.id)
    .eq('status', 'pending')
    .order('id')
    .limit(BATCH_SIZE);
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
  getOverview,
  prepareRecipients,
  sendNextBatch,
  sendTest
};
