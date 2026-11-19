// 자동화 '초안 작성' 도우미 (Claude Code가 "자동화 할 일 처리해줘" 요청을 처리할 때 사용)
// 비밀키 없이 .env의 기본 키로 동작합니다. 뉴스레터·게시글 초안은 프로젝트 폴더 '초안/'에 파일로 저장하고,
// 관리자가 파일을 확인한 뒤 관리자 화면에 올립니다(뉴스레터: 발송 탭에 HTML 파일 올리기 / 게시글: 복사해 붙여넣기).
//
//   node scripts/auto.js tasks                         할 일 목록 (요약이 빈 칼럼, 이번 달 뉴스레터, 게시글 초안이 없는 칼럼)
//   node scripts/auto.js blog <글번호>                  네이버 블로그 원문 텍스트 (초안 참고용, 그대로 옮기지 않음)
//   node scripts/auto.js column <칼럼id> <json파일>      칼럼 요약·FAQ·영문 초안을 DB에 저장 (승인 대기, 공개는 관리자가 체크)
//   node scripts/auto.js template [저장경로]             최근 발송 회차 HTML을 파일로 저장 (새 뉴스레터의 틀)

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch (e) { /* 환경변수로 직접 줄 수도 있음 */ }

const { createAnonClient } = require('../lib/supabase');
const { blogPostNo } = require('../lib/columns');

const DRAFT_DIR = path.join(ROOT, '초안');
const COLUMN_FIELDS = ['summary', 'key_points', 'checkpoint', 'faq', 'title_en', 'summary_en', 'key_points_en', 'checkpoint_en', 'category', 'published_on'];
const kstDay = (d = new Date()) => new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const draftExists = name => fs.existsSync(path.join(DRAFT_DIR, name));

async function cmdTasks(sb) {
  const { data: cols, error } = await sb.from('columns')
    .select('id, title, url, published_on, summary, summary_ready, category').order('sort_order');
  if (error) throw error;

  const need = cols.filter(c => !c.summary && blogPostNo(c.url));
  console.log(`# 1. 칼럼 요약·FAQ 초안 필요 ${need.length}개`);
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
  const input = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const update = {};
  for (const k of COLUMN_FIELDS) if (input[k] !== undefined) update[k] = typeof input[k] === 'string' ? input[k].trim() || null : input[k];
  if (!update.summary) throw new Error('summary가 비어 있습니다.');
  update.summary_ready = false; // 공개는 관리자가 미리보기 후 체크
  const { data, error } = await sb.from('columns').update(update).eq('id', id).select('id, title');
  if (error) throw error;
  if (!data.length) throw new Error(`칼럼 id ${id}를 저장하지 못했습니다 (없는 id이거나 권한 없음).`);
  console.log(`저장: ${data[0].title} (승인 대기 — 관리자 칼럼 탭에서 미리보기 후 체크하면 공개)`);
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
  const sb = createAnonClient();
  switch (cmd) {
    case 'tasks': return cmdTasks(sb);
    case 'column': return cmdColumn(sb, a1, a2);
    case 'template': return cmdTemplate(sb, a1);
    default:
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 9).join('\n'));
  }
})().catch(err => { console.error('오류:', err.message || err); process.exitCode = 1; });
