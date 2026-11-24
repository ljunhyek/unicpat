// 칼럼 썸네일 생성 (1200x630). 사용: node 초안/thumb/make.js <spec.json>
// spec: { "no": "글번호", "ko": {...}, "en": {...} }
//   각 언어: { tag, title(줄바꿈 \n, 강조 *단어*), sub, steps: ["상자1","상자2",...] (2~4개), footRight }
// 결과: spec 파일과 같은 폴더(보통 초안/thumb/)에 <no>.jpg, <no>_en.jpg
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DIR = path.dirname(path.resolve(process.argv[2]));
if (!fs.existsSync(path.join(DIR, 'unique-mark.png'))) fs.copyFileSync(path.join(__dirname, 'unique-mark.png'), path.join(DIR, 'unique-mark.png'));
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmtTitle = t => esc(t).replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');

function html(s, en) {
  const steps = s.steps || [];
  const boxes = steps.map((st, i) => `<div class="box${i === steps.length - 1 ? ' last' : ''}">${esc(st)}</div>`)
    .join('<div class="arr">→</div>');
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:'Noto Sans KR','Malgun Gothic',sans-serif;color:#fff;position:relative;background:#0F2A1D}
.bg{position:absolute;inset:0;background:radial-gradient(circle at 85% 15%,#2f6b3a 0,transparent 45%),linear-gradient(135deg,#0F2A1D 0%,#143824 60%,#1b4a2c 100%)}
.wrap{position:absolute;left:70px;right:70px;top:54px}
.tag{display:inline-block;background:#54B435;color:#0F2A1D;font-weight:700;font-size:22px;padding:8px 18px;border-radius:999px}
h1{margin-top:24px;font-size:${s.size || (en ? 58 : 58)}px;font-weight:900;line-height:1.2;letter-spacing:${en ? '-1.2px' : '-1.8px'}}
h1 em{font-style:normal;color:#9BE07A}
.sub{margin-top:14px;font-size:25px;color:#cfe8c4;font-weight:500}
.flow{position:absolute;left:70px;right:70px;bottom:120px;display:flex;align-items:center;gap:14px}
.box{flex:1;min-height:76px;display:flex;align-items:center;justify-content:center;text-align:center;padding:10px 14px;border-radius:12px;
  background:rgba(255,255,255,.08);border:2px solid #54B435;font-size:${en ? 20 : 22}px;font-weight:700;line-height:1.3;word-break:keep-all}
.box.last{background:#fff;color:#0F2A1D;border-color:#fff}
.arr{color:#9BE07A;font-size:30px;font-weight:900}
.foot{position:absolute;left:70px;right:70px;bottom:40px;display:flex;align-items:center;justify-content:space-between;font-size:22px;color:#cfe8c4}
.brand{display:flex;align-items:center;gap:12px;font-weight:700;color:#fff;font-size:24px}
.brand img{height:40px;background:#fff;border-radius:8px;padding:4px}
</style></head><body><div class="bg"></div>
<div class="wrap"><span class="tag">${esc(s.tag)}</span><h1>${fmtTitle(s.title)}</h1><p class="sub">${esc(s.sub)}</p></div>
<div class="flow">${boxes}</div>
<div class="foot"><div class="brand"><img src="unique-mark.png">${en ? 'Unic Patent Firm' : '유니크 특허사무소'}</div>
<div>${esc(s.footRight || (en ? 'Patent Attorney Junhyek Lee · Incheon, Korea' : '이준혁 변리사 · 인천 청라'))}</div></div>
</body></html>`;
}

for (const [lang, sfx] of [['ko', ''], ['en', '_en']]) {
  const s = spec[lang];
  if (!s) continue;
  const base = path.join(DIR, `${spec.no}${sfx}`);
  fs.writeFileSync(`${base}.html`, html(s, lang === 'en'));
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1200,630',
    '--virtual-time-budget=5000', `--screenshot=${base}.png`, 'file:///' + `${base}.html`.replace(/\\/g, '/')], { stdio: 'ignore' });
  execFileSync('python', ['-c', `from PIL import Image; Image.open(r'${base}.png').convert('RGB').save(r'${base}.jpg',quality=86,optimize=True,progressive=True)`]);
  console.log(`${base}.jpg`);
}
