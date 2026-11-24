// 자동화 '초안 작성' 도우미 (Claude Code가 "자동화 할 일 처리해줘" 요청을 처리할 때 사용)
// 비밀키 없이 .env의 기본 키로 동작합니다. 뉴스레터·게시글 초안은 프로젝트 폴더 '초안/'에 파일로 저장하고,
// 관리자가 파일을 확인한 뒤 관리자 화면에 올립니다(뉴스레터: 발송 탭에 HTML 파일 올리기 / 게시글: 복사해 붙여넣기).
//
//   node scripts/auto.js tasks                         할 일 목록 (글이 빈 칼럼, 이번 달 뉴스레터, 게시글 초안이 없는 칼럼)
//   node scripts/auto.js blog <글번호>                  네이버 블로그 원문 텍스트 (초안의 근거, 그대로 옮기지 않음)
//   node scripts/auto.js preview <json파일>              검토용 HTML을 초안/칼럼_<글번호>.html (영문은 _en.html) 로 만듦
//   node scripts/auto.js column <칼럼id> <json파일>      칼럼 글(제목·본문·썸네일·FAQ·영문)을 DB에 저장 (새 글은 승인 대기)
//   node scripts/auto.js template [저장경로]             최근 발송 회차 HTML을 파일로 저장 (새 뉴스레터의 틀)

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch (e) { /* 환경변수로 직접 줄 수도 있음 */ }

const { createAnonClient } = require('../lib/supabase');
const { blogPostNo, filledColumnIds, parseFaq } = require('../lib/columns');

const DRAFT_DIR = path.join(ROOT, '초안');
// 긴 글 방식: title, body_html, thumbnail, faq + 영문 title_en, body_html_en, thumbnail_en
// (summary·key_points·checkpoint와 *_en은 예전 요약 방식 칸 — 긴 글이 있으면 화면에 쓰지 않음)
const COLUMN_FIELDS = ['title', 'body_html', 'thumbnail', 'faq', 'title_en', 'body_html_en', 'thumbnail_en',
  'summary', 'key_points', 'checkpoint', 'summary_en', 'key_points_en', 'checkpoint_en', 'category', 'published_on'];
const kstDay = (d = new Date()) => new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const draftExists = name => fs.existsSync(path.join(DRAFT_DIR, name));

async function cmdTasks(sb) {
  const { data: cols, error } = await sb.from('columns')
    .select('id, title, title_en, url, published_on, summary_ready, category').order('sort_order');
  if (error) throw error;
  const filled = await filledColumnIds(sb);

  const need = cols.filter(c => !filled.has(c.id) && blogPostNo(c.url));
  console.log(`# 1. 칼럼 글(긴 글·썸네일·영문) 초안 필요 ${need.length}개`);
  for (const c of need) console.log(`  id=${c.id} no=${blogPostNo(c.url)} ${c.published_on || ''} [${c.category}] ${c.title}`);

  const today = kstDay();
  const ym = today.slice(0, 7);
  const nlFile = `뉴스레터_${ym}.html`;
  const monthCols = cols.filter(c => (c.published_on || '').startsWith(ym) && blogPostNo(c.url))
    .sort((a, b) => b.published_on.localeCompare(a.published_on)).slice(0, 3);
  const { data: sentList } = await sb.rpc('newsletter_archive_list');
  const sentThisMonth = (sentList || []).filter(c => kstDay(new Date(c.sent_on)).startsWith(ym));
  console.log(`\n# 2. 뉴스레터 (${ym}) — 매월 15일부터`);
  if (sentThisMonth.length) console.log(`  이번 달 발송함: ${sentThisMonth.map(c => c.subject).join(', ')}`);
  else if (Number(today.slice(8)) < 15) console.log('  15일 전이라 아직 필요 없음');
  else if (draftExists(nlFile)) console.log(`  초안 있음: 초안/${nlFile}`);
  else {
    console.log(`  초안 필요 → 초안/${nlFile} (이미 발송 탭에 이번 달 회차를 올렸다면 건너뜀)`);
    monthCols.forEach(c => console.log(`  - no=${blogPostNo(c.url)} ${c.published_on} ${c.title}`));
  }

  const since = kstDay(new Date(Date.now() - 30 * 86400000));
  const social = cols.filter(c => c.summary_ready && (c.published_on || '') >= since && blogPostNo(c.url))
    .filter(c => !draftExists(`게시글_${blogPostNo(c.url)}.txt`));
  console.log(`\n# 3. 게시글 초안 필요 (최근 30일 공개 칼럼) ${social.length}개`);
  for (const c of social) console.log(`  no=${blogPostNo(c.url)} → 초안/게시글_${blogPostNo(c.url)}.txt  ${c.title}`);
}

// 네이버 블로그 본문 (WebFetch는 m.blog를 막으므로 PostView를 직접 받음)
async function cmdBlog(no) {
  const res = await fetch(`https://blog.naver.com/PostView.naver?blogId=unicpat&logNo=${no}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' }
  });
  if (!res.ok) throw new Error(`블로그 HTTP ${res.status}`);
  const html = await res.text();
  const title = (html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] || '';
  const paras = [...html.matchAll(/<p class="se-text-paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>/g)]
    .map(m => m[1].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;|​/g, ' ')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim())
    .filter(Boolean);
  console.log(`# ${title}\n\n${paras.join('\n')}`);
}

async function cmdColumn(sb, id, file) {
  const input = readColumnInput(file);
  const update = {};
  for (const k of COLUMN_FIELDS) if (input[k] !== undefined) update[k] = typeof input[k] === 'string' ? input[k].trim() || null : input[k];
  if (!update.body_html && !update.body_html_en && !update.summary) throw new Error('body_html이 비어 있습니다.');
  if (update.body_html_en && !update.title_en) throw new Error('영문 본문을 저장할 때는 title_en도 필요합니다(영어 목록 연결에 사용).');
  const { data: cur, error: e1 } = await sb.from('columns').select('id, summary_ready').eq('id', id).maybeSingle();
  if (e1) throw e1;
  if (!cur) throw new Error(`칼럼 id ${id}가 없습니다.`);
  // 새 글은 승인 대기로. 이미 공개된 글은 공개 상태를 그대로 둠(내리면 공개 페이지가 사라짐)
  if (!cur.summary_ready) update.summary_ready = false;
  const { data, error } = await sb.from('columns').update(update).eq('id', id).select('id, title');
  if (error) throw error;
  if (!data.length) throw new Error(`칼럼 id ${id}를 저장하지 못했습니다 (권한 없음).`);
  console.log(cur.summary_ready
    ? `저장: ${data[0].title} (이미 공개된 글 — 저장한 내용이 공개 페이지에 바로 반영됩니다)`
    : `저장: ${data[0].title} (승인 대기 — 관리자 칼럼 탭에서 미리보기 후 체크하면 공개)`);
}

// JSON 입력: body_file / body_file_en(본문 HTML 파일), thumbnail_file / thumbnail_file_en(JPG/PNG)은 JSON 파일 기준 상대경로
function readColumnInput(file) {
  const input = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const rel = f => path.resolve(path.dirname(file), f);
  for (const sfx of ['', '_en']) {
    const body = input[`body_file${sfx}`];
    if (body) input[`body_html${sfx}`] = fs.readFileSync(rel(body), 'utf8');
    const thumb = input[`thumbnail_file${sfx}`];
    if (thumb) {
      const mime = /\.png$/i.test(thumb) ? 'image/png' : 'image/jpeg';
      input[`thumbnail${sfx}`] = `data:${mime};base64,${fs.readFileSync(rel(thumb)).toString('base64')}`;
    }
  }
  return input;
}

// 저장 전 검토용 HTML (홈페이지 글 페이지와 같은 본문 스타일). 한국어 + 영문(있으면 _en.html)
function cmdPreview(file) {
  const input = readColumnInput(file);
  writePreview(input, '');
  if (input.body_html_en) writePreview(input, '_en');
}

function writePreview(input, sfx) {
  const en = sfx === '_en';
  const esc = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const view = fs.readFileSync(path.join(ROOT, 'views', 'column-post.ejs'), 'utf8');
  const css = (view.match(/\/\* 긴 글 본문[\s\S]*?(?=<\/style>)/) || [''])[0];
  const title = input[`title${sfx}`];
  const body = String(input[`body_html${sfx}`] || '').replace(/\{\{\s*thumbnail\s*\}\}/g, input[`thumbnail${sfx}`] || '');
  // FAQ는 한국어 화면에만 (JSON에 없으면 DB에 있는 기존 FAQ가 그대로 쓰임)
  const faq = en ? '' : parseFaq(input.faq)
    .map(f => `<details open><summary><b>Q.</b> ${esc(f.q)}</summary><p><b>A.</b> ${esc(f.a)}</p></details>`).join('\n');
  const no = input.no || 'draft';
  const out = path.join(DRAFT_DIR, `칼럼_${no}${sfx}.html`);
  fs.writeFileSync(out, `<!doctype html><html lang="${en ? 'en' : 'ko'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>[초안] ${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
<style>body{margin:0;background:#f6f7f5;font-family:'Noto Sans KR',sans-serif}.wrap{max-width:760px;margin:0 auto;padding:40px 20px 80px;font-size:17px}
h1.t{font-size:1.9em;line-height:1.35;color:#0F172A;word-break:keep-all}.meta{color:#6b7280;font-size:14px;margin-bottom:32px}
details{background:#fff;border-radius:8px;padding:14px 18px;margin-top:10px;box-shadow:0 1px 3px rgba(0,0,0,.06)}summary{cursor:pointer}
${css}</style></head><body><div class="wrap">
<p class="meta">검토용 초안${en ? ' (영문)' : ''} · 홈페이지 칼럼 /column/${esc(no)} · 블로그 원제: ${esc(input.blog_title)}</p>
<h1 class="t">${esc(title)}</h1>
<div class="post-article">${body}</div>
${faq ? `<h2 style="margin-top:48px;font-size:1.2em">자주 묻는 질문</h2>${faq}` : ''}
</div></body></html>`);
  console.log(`검토용 초안 → ${out}`);
}

// 최근 발송 회차 (공개 함수라 기본 키로 읽을 수 있음)
async function cmdTemplate(sb, out) {
  const { data: list, error } = await sb.rpc('newsletter_archive_list');
  if (error) throw error;
  if (!list || !list.length) throw new Error('발송한 회차가 없습니다.');
  const latest = [...list].sort((a, b) => String(b.sent_on).localeCompare(String(a.sent_on)))[0];
  const { data, error: e2 } = await sb.rpc('newsletter_archive_get', { p_id: latest.id });
  if (e2) throw e2;
  const row = Array.isArray(data) ? data[0] : data;
  const file = out || path.join(DRAFT_DIR, '_지난회차_틀.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, row.html);
  console.log(`지난 회차 '${latest.subject}' (id ${latest.id}) → ${file}`);
  console.log('※ 공개용으로 저장된 HTML이라 수신거부 링크가 빠져 있을 수 있습니다. 새 회차 맨 아래에 {{unsubscribe_url}} 수신거부 링크를 꼭 넣으세요.');
}

(async () => {
  const [cmd, a1, a2] = process.argv.slice(2);
  if (cmd === 'blog') return cmdBlog(a1);
  if (cmd === 'preview') return cmdPreview(a1);
  const sb = createAnonClient();
  switch (cmd) {
    case 'tasks': return cmdTasks(sb);
    case 'column': return cmdColumn(sb, a1, a2);
    case 'template': return cmdTemplate(sb, a1);
    default:
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 10).join('\n'));
  }
})().catch(err => { console.error('오류:', err.message || err); process.exitCode = 1; });
