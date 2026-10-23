/**
 * 엑셀 고객 목록 → Supabase newsletter_subscribers
 *
 * Usage:
 *   node scripts/import-subscribers.js [엑셀파일]          # 실제 저장
 *   node scripts/import-subscribers.js [엑셀파일] --dry    # 저장 없이 점검만
 *
 * 기본 파일: 홈페이지_인천기업_스티비용.xlsx
 * 같은 이메일이 이미 있으면 기업 정보만 갱신합니다 (수신거부 상태는 유지).
 * 실행 중 관리자 이메일/비밀번호를 물어봅니다 (관리자 페이지 로그인 계정).
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */
require('dotenv').config();
const path = require('path');
const readline = require('readline');
const ExcelJS = require('exceljs');
const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const file = path.resolve(args.find(a => !a.startsWith('--')) || '홈페이지_인천기업_스티비용.xlsx');

// 엑셀 헤더 → DB 컬럼
const COLUMNS = {
  '이메일': 'email',
  '기업명': 'company_name',
  '대표자': 'ceo',
  '기업 고유번호': 'company_no',
  '사업자등록번호': 'biz_no',
  '홈페이지': 'homepage',
  '업종명': 'industry_name',
  '생산품': 'products',
  '종업원 수': 'employees',
  '연락처': 'phone',
  '공장전화번호': 'factory_phone',
  '소재지': 'address',
  '공장주소': 'factory_address',
  '업종': 'industry',
  '규모': 'size',
  '특성': 'traits',
  '지역': 'region',
  '기업인증': 'certification',
  '설립일': 'founded_on'
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function cellText(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if (value.richText) return value.richText.map(r => r.text).join('');
    if ('text' in value) return cellText(value.text);
    if ('result' in value) return cellText(value.result);
  }
  const text = String(value).trim();
  return text === '' ? null : text;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = workbook.worksheets[0];

  const headers = [];
  sheet.getRow(1).eachCell((cell, col) => { headers[col] = cellText(cell.value); });

  const byEmail = new Map();
  const skipped = [];

  sheet.eachRow((row, rowNo) => {
    if (rowNo === 1) return;
    const rec = {};
    headers.forEach((header, col) => {
      const key = COLUMNS[header];
      if (key && !(key in rec)) rec[key] = cellText(row.getCell(col).value);
    });

    // "Email info@..." 처럼 앞뒤에 다른 글자가 붙은 경우 주소만 추출
    const match = (rec.email || '').match(EMAIL_RE);
    if (!match) {
      skipped.push(`${rowNo}행 ${rec.company_name || ''}: ${rec.email || '(빈 값)'}`);
      return;
    }
    rec.email = match[0].toLowerCase();
    rec.employees = Number.isFinite(Number(rec.employees)) && rec.employees !== null ? Number(rec.employees) : null;
    rec.source = path.basename(file);

    // 같은 이메일이 여러 번 나오면 기업인증이 있는 행을 우선
    const prev = byEmail.get(rec.email);
    if (!prev || (!prev.certification && rec.certification)) byEmail.set(rec.email, rec);
  });

  const rows = [...byEmail.values()];
  const certified = rows.filter(r => r.certification).length;

  console.log(`파일: ${file}`);
  console.log(`고유 이메일: ${rows.length}건 (기업인증 있음 ${certified}건)`);
  console.log(`제외: ${skipped.length}건`);
  skipped.forEach(s => console.log(`  - ${s}`));

  if (dryRun) {
    console.log('\n--dry: 저장하지 않았습니다.');
    return;
  }

  // 테이블은 관리자만 쓸 수 있으므로 관리자 계정으로 로그인
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
  const email = process.env.ADMIN_EMAIL || await ask('\n관리자 이메일: ');
  const password = process.env.ADMIN_PASSWORD || await ask('관리자 비밀번호: ', true);
  const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
  if (loginErr) throw new Error(`로그인 실패: ${loginErr.message}`);

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase.from('newsletter_subscribers').upsert(chunk, { onConflict: 'email' });
    if (error) throw new Error(`저장 실패 (${i + 1}~${i + chunk.length}): ${error.message}`);
    console.log(`✓ ${i + chunk.length}/${rows.length}`);
  }
  console.log('\n완료');
}

// 터미널 입력 (hidden: 입력 내용을 화면에 표시하지 않음)
function ask(question, hidden = false) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = text => {
        if (text.includes(question)) process.stdout.write(text);
      };
    }
    rl.question(question, answer => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

main().catch(err => {
  console.error(err.message || err);
  process.exitCode = 1;
});
