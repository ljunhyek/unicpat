const express = require('express');
const router = express.Router();
const { createAnonClient } = require('../lib/supabase');
const { translatePostTitles } = require('../lib/translate');
const { sortByDateDesc, currentByDeadline } = require('../lib/sort');
const { UUID_RE, TEST_TOKEN, archiveHtml, sendSignupNotice } = require('../lib/newsletter-mailer');
const { COLUMN_LIST_FIELDS, COLUMN_POST_FIELDS, renderBodyHtml, bodyLeadText, decodeDataUri, withColumnLinks, parseFaq, CATEGORY_NAMES, CATEGORY_NAMES_EN } = require('../lib/columns');
const { dataImages } = require('../lib/newsletter-import');
const { EN_PAGES, hasEnPage, enPath } = require('../lib/i18n');

const supabase = createAnonClient();

// KST 기준 'YYYY.MM.DD'
function kstDate(ts) {
    return new Date(new Date(ts).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '.');
}

// 직접 등록한 뉴스레터(HTML 업로드, 예전 스티비 링크) + 관리자 메뉴에서 발송한 뉴스레터
// 관리자 화면에서도 같은 목록을 쓰며, sent 항목은 발송 기록이라 목록에서 삭제하지 않음
async function loadNewsletters() {
    const [nlRes, archiveRes] = await Promise.all([
        supabase.from('newsletters').select('id, title, link, date'),
        supabase.rpc('newsletter_archive_list')
    ]);
    if (nlRes.error) console.error('Newsletter list error:', nlRes.error.message);
    if (archiveRes.error) console.error('Newsletter archive error:', archiveRes.error.message);
    const sent = (archiveRes.data || []).map(c => ({
        title: c.subject,
        link: `/newsletter/${c.id}`,
        date: kstDate(c.sent_on),
        sent: true
    }));
    return sortByDateDesc([...(nlRes.data || []), ...sent]);
}

// 같은 회차인지 비교할 제목: (광고) 표기와 공백 차이는 무시
function newsletterTitleKey(title) {
    return String(title || '').replace(/^\s*\(광고\)\s*/, '').replace(/\s+/g, '');
}

// 홈페이지에 보여 줄 뉴스레터: 링크가 없거나 임시 문구(your-link-here)인 회차는 감춤 (관리자 화면에는 그대로 표시)
// 같은 회차를 HTML로도 저장하고 메일로도 발송했으면 발송본 하나만 보여 줌
function viewableNewsletters(list) {
    const sentTitles = new Set(list.filter(n => n.sent).map(n => newsletterTitleKey(n.title)));
    return list.filter(n => n.link && !/your-link-here/i.test(n.link)
        && (n.sent || !sentTitles.has(newsletterTitleKey(n.title))));
}

// 메일 HTML을 그대로 표시 (조각 HTML이면 문서 머리말을 붙임)
function sendNewsletterHtml(res, subject, html) {
    const body = archiveHtml(html);
    if (/<html[\s>]/i.test(body)) return res.type('html').send(body);
    const title = subject.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    res.type('html').send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | 유니크 뉴스레터</title>${body}`);
}

// 홈페이지
router.get('/', async (req, res) => {
    try {
        const [colRes, newsletters, projRes] = await Promise.all([
            supabase.from('columns').select(COLUMN_LIST_FIELDS).order('sort_order').limit(3),
            loadNewsletters(),
            supabase.from('gov_projects').select('*')
        ]);

        const lang = res.locals.lang;
        let posts = colRes.data || [];
        if (lang === 'en') posts = await translatePostTitles(posts);
        posts = withColumnLinks(posts);
        // 뉴스레터·정부지원사업 목록: 영어 화면은 제목만 번역 (본문 페이지는 한국어)
        let homeNewsletters = viewableNewsletters(newsletters).slice(0, 4);
        let homeProjects = currentByDeadline(projRes.data || []).slice(0, 4);
        if (lang === 'en') [homeNewsletters, homeProjects] = await Promise.all([translatePostTitles(homeNewsletters), translatePostTitles(homeProjects)]);

        res.render('index', {
            title: '유니크 특허사무소',
            titleEn: 'Patent & Trademark Attorney in Incheon, Korea',
            descriptionEn: 'Unic Patent Firm in Cheongna, Incheon, Korea. A patent attorney with 20 years of experience personally advises on patent, trademark and design applications, government support programs and commercializing ideas.',
            description: '인천 청라 유니크 특허사무소. 20년 경력의 변리사가 특허·상표·디자인 출원부터 정부지원사업, 아이디어 사업화까지 직접 상담합니다.',
            posts,
            newsletters: homeNewsletters,
            govProjects: homeProjects
        });
    } catch (err) {
        console.error('Homepage error:', err);
        res.render('index', {
            title: '유니크 특허사무소',
            description: '',
            posts: [], newsletters: [], govProjects: []
        });
    }
});

// 유니크 소개
router.get('/about', (req, res) => {
    res.render('about', {
        title: '유니크 소개',
        titleEn: 'About Unique',
        descriptionEn: 'Differentiated services built on 20 years of expertise and real-world startup experience. Meet the team at Unic Patent Firm and see what sets us apart.',
        description: '20년 경력의 전문성과 실전 창업 경험이 만든 차별화된 서비스. 유니크 특허사무소만의 강점과 구성원들을 소개합니다.'
    });
});

// 유니크 칼럼 페이지
// 칼럼 분류 (메인 화면 섹션 순서 = 이 배열 순서)
const COLUMN_CATEGORIES = [
    { id: 'strategy',  title: '지식재산 전략',   titleEn: 'IP Strategy',        bgColor: '#f9fafb' },
    { id: 'patent',    title: '특허 출원',       titleEn: 'Patent Application', bgColor: '#EDFBE2' },
    { id: 'trademark', title: '상표/디자인 출원', titleEn: 'Trademark / Design', bgColor: '#f9fafb' }
];
const COLUMN_PAGE_SIZE = 12;

// 칼럼 전체 목록 (최신순, 영어 화면이면 제목 번역)
async function loadColumnPosts(lang) {
    const { data, error } = await supabase.from('columns').select(COLUMN_LIST_FIELDS).order('sort_order');
    if (error) throw error;
    let posts = data || [];
    if (lang === 'en') posts = await translatePostTitles(posts);
    return withColumnLinks(posts);
}

router.get('/column', async (req, res) => {
    try {
        const posts = await loadColumnPosts(res.locals.lang);
        res.render('column', {
            title: '유니크 칼럼',
            titleEn: 'Unique Column',
            descriptionEn: 'Practical, expert articles on intellectual property in Korea: patents, trademarks and designs, AI patents, overseas filing and more.',
            description: '지식재산권에 관한 전문적이고 실용적인 정보를 제공합니다. 특허, 상표, 디자인부터 AI 특허, 해외 출원까지 다양한 주제를 다룹니다.',
            posts,
            categories: COLUMN_CATEGORIES
        });
    } catch (err) {
        console.error('Column page error:', err);
        res.render('column', { title: '유니크 칼럼', description: '', posts: [], categories: COLUMN_CATEGORIES });
    }
});

// 분류별 전체 칼럼 목록 (12개씩 페이지로 나눔, 새 글이 앞에 쌓임)
router.get('/column/:cat(strategy|patent|trademark)', async (req, res, next) => {
    const category = COLUMN_CATEGORIES.find(c => c.id === req.params.cat);
    try {
        const all = (await loadColumnPosts(res.locals.lang)).filter(p => p.category === category.id);
        const totalPages = Math.max(1, Math.ceil(all.length / COLUMN_PAGE_SIZE));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        if (page > totalPages) return next();
        // 2페이지부터는 페이지마다 다른 주소로 검색엔진에 알림
        if (page > 1) res.locals.canonicalUrl += `?page=${page}`;
        const en = res.locals.lang === 'en';
        const name = en ? category.titleEn : category.title;
        res.render('column-list', {
            title: `${name}${page > 1 ? (en ? ` (Page ${page})` : ` (${page}페이지)`) : ''} - ${en ? 'Unique Column' : '유니크 칼럼'}`,
            description: en
                ? `All Unique Column posts on ${name}, newest first.`
                : `유니크 특허사무소 이준혁 변리사의 '${name}' 칼럼 전체 목록입니다. 최신 글부터 차례로 볼 수 있습니다.`,
            category,
            categories: COLUMN_CATEGORIES,
            posts: all.slice((page - 1) * COLUMN_PAGE_SIZE, page * COLUMN_PAGE_SIZE),
            total: all.length,
            page,
            totalPages
        });
    } catch (err) {
        console.error('Column list error:', err);
        next(err);
    }
});

// 칼럼 글 페이지: 블로그 글의 요약 + 블로그 전체 글 링크 (관리자가 요약을 '공개'한 글만)
router.get('/column/:no(\\d+)', async (req, res, next) => {
    const find = fields => supabase.from('columns').select(fields)
        .eq('url', `https://blog.naver.com/unicpat/${req.params.no}`)
        .eq('summary_ready', true)
        .maybeSingle();
    let { data: post, error } = await find(COLUMN_POST_FIELDS);
    // body_html 칸이 아직 없으면(supabase/column_article.sql 실행 전) 전체 칸으로 다시 읽음
    if (error) ({ data: post, error } = await find('*'));
    if (error) console.error('Column post error:', error.message);
    if (!post) return next();
    // 영어 글이 없으면 영어 주소(/en/column/글번호)는 한국어 주소로 보내고, 한국어 화면에 영어 짝을 표시하지 않음
    if (!(post.body_html_en || post.summary_en)) {
        if (res.locals.lang === 'en') return res.redirect(302, `/column/${req.params.no}`);
        res.locals.langUrls = { ...res.locals.langUrls, en: null };
    }

    // 같은 분류의 글을 먼저, 모자라면 다른 분류의 최신 글로 4개까지 채움 (홈페이지 안에서 다음 글로 이어 읽도록)
    const [{ data: sameCategory }, { data: latest }] = await Promise.all([
        supabase.from('columns').select(COLUMN_LIST_FIELDS)
            .eq('category', post.category).eq('summary_ready', true).neq('id', post.id)
            .order('sort_order').limit(4),
        supabase.from('columns').select(COLUMN_LIST_FIELDS)
            .eq('summary_ready', true).neq('id', post.id)
            .order('sort_order').limit(8)
    ]);
    const related = [...(sameCategory || [])];
    for (const p of latest || []) {
        if (related.length >= 4) break;
        if (!related.some(r => r.id === p.id)) related.push(p);
    }
    res.render('column-post', columnPostLocals(post, withColumnLinks(related), res.locals.lang, {
        ko: `/column/${req.params.no}/thumbnail.jpg`,
        en: `/column/${req.params.no}/thumbnail-en.jpg`
    }));
});

// 칼럼 썸네일 (한국어: thumbnail 칸, 영어: thumbnail_en 칸의 이미지)
router.get('/column/:no(\\d+)/:file(thumbnail|thumbnail-en).jpg', async (req, res, next) => {
    const field = req.params.file === 'thumbnail-en' ? 'thumbnail_en' : 'thumbnail';
    const { data } = await supabase.from('columns').select(field)
        .eq('url', `https://blog.naver.com/unicpat/${req.params.no}`)
        .eq('summary_ready', true)
        .maybeSingle();
    const image = data && decodeDataUri(data[field]);
    if (!image) return next();
    // Vercel CDN이 하루 동안 보관 → 같은 썸네일을 방문자마다 DB에서 다시 읽지 않음 (Supabase 전송량 절약). 교체하면 최대 하루 뒤 반영
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.type(image.mime).send(image.buffer);
});

// 칼럼 글 페이지 화면 데이터 (관리자 미리보기와 같이 사용)
// 영어 화면(lang=en)이고 영어 글(영문 긴 글 또는 예전 영어 요약)이 있으면 영어로, 아니면 한국어로 보여줌
// 긴 글 본문(body_html / body_html_en)이 있으면 그것만 보여주고, 없을 때만 예전 요약·핵심 정리를 보여줌
// thumbUrls: 본문의 {{thumbnail}} 자리에 넣을 썸네일 주소 { ko, en } (공개 페이지와 관리자 미리보기가 다름)
function columnPostLocals(post, related, lang, thumbUrls = {}) {
    const en = lang === 'en' && !!(post.body_html_en || post.summary_en);
    const pick = field => (en ? post[`${field}_en`] : post[field]) || '';
    const title = pick('title') || post.title;
    const rawBody = pick('body_html');
    const thumbUrl = (en ? thumbUrls.en : thumbUrls.ko) || '';
    const bodyHtml = rawBody ? renderBodyHtml(rawBody, thumbUrl) : '';
    const hasThumb = !!bodyHtml && /\{\{\s*thumbnail\s*\}\}/.test(rawBody);
    const paragraphs = bodyHtml ? [] : pick('summary').split(/\n\s*\n/).map(t => t.trim()).filter(Boolean);
    return {
        title,
        description: ((bodyHtml && bodyLeadText(bodyHtml)) || paragraphs[0] || title).replace(/\s+/g, ' ').slice(0, 150),
        bodyHtml,
        // 공유 미리보기 이미지 (공개 페이지에서만)
        ogImage: hasThumb && thumbUrl && thumbUrl.startsWith('/column/') ? thumbUrl : null,
        post,
        en,
        postTitle: title,
        paragraphs,
        keyPoints: bodyHtml ? [] : pick('key_points').split('\n').map(t => t.trim()).filter(Boolean),
        checkpoint: bodyHtml ? '' : pick('checkpoint'),
        // 자주 묻는 질문은 한국어 화면에만 표시
        faqs: en ? [] : parseFaq(post.faq),
        ogType: 'article',
        CATEGORY_NAMES,
        CATEGORY_NAMES_EN,
        categoryName: (en ? CATEGORY_NAMES_EN : CATEGORY_NAMES)[post.category] || (en ? 'Unique Column' : '유니크 칼럼'),
        // 영어 화면에서는 영어 요약이 있는 글만 추천 (블로그로 나가는 링크 없음)
        related: (related || [])
            .filter(r => !en || r.enInternal)
            .map(r => ({ ...r, displayTitle: (en && r.title_en) || r.title })),
        preview: false
    };
}
router.columnPostLocals = columnPostLocals;
router.loadNewsletters = loadNewsletters;

// 뉴스레터 페이지
router.get('/newsletter', async (req, res) => {
    try {
        res.render('newsletter', {
            title: '유니크 뉴스레터',
            description: '사업에 도움이 되는 특허, 상표, 정부지원사업 등 최신 IP 트렌드와 실무 팁을 담은 유니크 특허사무소의 뉴스레터를 만나보세요.',
            newsletters: viewableNewsletters(await loadNewsletters())
        });
    } catch (err) {
        console.error('Newsletter page error:', err);
        res.render('newsletter', { title: '유니크 뉴스레터', description: '', newsletters: [] });
    }
});

// 관리자 메뉴에서 발송한 지난 뉴스레터 본문 (메일 HTML 그대로 표시)
router.get('/newsletter/:id(\\d+)', async (req, res, next) => {
    const { data, error } = await supabase.rpc('newsletter_archive_get', { p_id: Number(req.params.id) });
    if (error) console.error('Newsletter archive error:', error.message);
    const item = data && data[0];
    if (!item) return next();
    sendNewsletterHtml(res, item.subject, item.html);
});

// HTML로 올린 뉴스레터 안의 이미지 (발송용 HTML에서 이 주소로 연결)
router.get('/newsletter/:id/img/:n(\\d+)', async (req, res, next) => {
    if (!UUID_RE.test(req.params.id)) return next();
    const { data } = await supabase.from('newsletters').select('html').eq('id', req.params.id).maybeSingle();
    const image = data && dataImages(data.html)[Number(req.params.n)];
    if (!image) return next();
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.type(image.mime).send(Buffer.from(image.base64, 'base64'));
});

// 관리자 화면에서 HTML로 올린 뉴스레터 본문
router.get('/newsletter/:id', async (req, res, next) => {
    if (!UUID_RE.test(req.params.id)) return next();
    const { data, error } = await supabase.from('newsletters').select('title, html').eq('id', req.params.id).maybeSingle();
    if (error) console.error('Newsletter page error:', error.message);
    if (!data || !data.html) return next();
    sendNewsletterHtml(res, data.title, data.html);
});

// 정부지원사업 페이지
router.get('/gov-support', async (req, res) => {
    try {
        const [typesRes, projRes] = await Promise.all([
            supabase.from('gov_support_types').select('*').order('created_at', { ascending: false }),
            supabase.from('gov_projects').select('*')
        ]);
        res.render('gov-support', {
            title: '정부지원사업 안내',
            description: '국가 R&D 지원사업 신청에 필요한 특허 컨설팅. 과제 준비부터 제안서 작성, 선정까지 유니크 특허사무소가 함께합니다.',
            programTypes: typesRes.data || [],
            govProjects: currentByDeadline(projRes.data || [])
        });
    } catch (err) {
        console.error('Gov-support page error:', err);
        res.render('gov-support', { title: '정부지원사업 안내', description: '', programTypes: [], govProjects: [] });
    }
});

// Contact Us 페이지
router.get('/contact', (req, res) => {
    res.render('contact', {
        title: '상담 신청 | 인천 청라',
        titleEn: 'Contact Us',
        descriptionEn: 'Contact Unic Patent Firm in Cheongna, Incheon, Korea. Call +82-32-288-7960, email us or use the consultation form, and a patent attorney will reply personally. Your first consultation is free, and in-person meetings at our office are available by appointment.',
        description: '인천 청라 유니크 특허사무소 상담 신청. 전화 032-288-7960, 메일, 상담 신청 폼으로 문의하시면 변리사가 직접 답변드립니다. 첫 상담은 무료이며, 예약 후 청라 사무실에서 방문 상담도 가능합니다.'
    });
});

// 비용 안내
router.get('/price', (req, res) => {
    res.render('price', {
        title: '비용 안내 | 인천 특허·상표·디자인 출원 비용',
        titleEn: 'Fees',
        descriptionEn: 'Patent, utility model, trademark and design filing fees in Korea at Unic Patent Firm, Incheon: attorney fees and official KIPO fees from filing to registration, plus how to cut costs with fee reductions and government support programs.',
        description: '인천 청라 유니크 특허사무소의 특허·실용신안, 상표, 디자인 출원 비용 안내. 출원부터 등록까지 대리인 수수료와 특허청 관납료, 관납료 감면과 정부지원사업으로 비용을 줄이는 방법까지 한곳에 정리했습니다.'
    });
});

// 찾아오시는 길
router.get('/location', (req, res) => {
    res.render('location', {
        title: '찾아오시는 길 | 인천 청라',
        titleEn: 'Location',
        descriptionEn: 'Directions to Unic Patent Firm: Room 279, 2F, Building 103, Cheongna Sun & Builder Terrace, Cheongna, Incheon, Korea. Underground parking is available, and the office is a 3–5 minute walk from the nearest bus stop. Please book before visiting.',
        description: '인천 청라 유니크 특허사무소 찾아오시는 길. 청라썬앤빌더테라스 103동 2층 279호, 건물 지하주차장 이용 가능, 청라센트럴에일린의뜰 정류장에서 도보 3~5분. 방문 상담은 예약 후 이용해 주세요.'
    });
});

// 인천 지역 안내
router.get('/incheon', (req, res) => {
    res.render('incheon', {
        title: '인천 특허사무소 | 청라·송도·남동 기업 특허·상표 상담',
        titleEn: 'Patent Attorney in Incheon',
        description: '인천 청라에 있는 유니크 특허사무소. 청라·송도·남동·부평·검단 등 인천 지역 기업과 스타트업의 특허·상표·디자인 출원을 20년 경력 변리사가 직접 상담하고, 인천 지역 지원사업 연계까지 도와드립니다.'
    });
});

// 서비스 안내 페이지들
router.get('/patent', (req, res) => {
    res.render('patent', {
        title: '인천 특허출원·실용신안 | 비용 안내',
        titleEn: 'Patent & Utility Model Applications',
        descriptionEn: 'Patent and utility model applications in Korea with Unic Patent Firm, Incheon. A patent attorney with 20 years of experience advises you personally and tells you the costs from filing to registration up front.',
        description: '인천 청라 유니크 특허사무소의 특허·실용신안 출원 안내. 20년 경력 변리사가 직접 상담하고, 출원부터 등록까지 비용을 미리 안내합니다. 인천 지역 중소기업·스타트업 정부지원사업 연계.'
    });
});

router.get('/trademark', (req, res) => {
    res.render('trademark', {
        title: '인천 상표등록 | 상표출원 절차와 비용',
        titleEn: 'Trademark Registration',
        descriptionEn: 'Trademark registration in Korea with Unic Patent Firm, Incheon. Protect your brand name and logo: the filing process, costs per class and official fee reductions, handled personally by a patent attorney.',
        description: '인천 청라 유니크 특허사무소의 상표등록 안내. 브랜드 이름과 로고를 지키는 상표출원 절차와 비용(1상품류 기준), 관납료 감면까지 변리사가 직접 챙겨 드립니다.'
    });
});

router.get('/design', (req, res) => {
    res.render('design', {
        title: '인천 디자인등록 | 디자인 출원',
        titleEn: 'Design Registration',
        descriptionEn: 'Design registration in Korea with Unic Patent Firm, Incheon. Protect the look of your products and packaging and stop copycats: the design filing process and costs explained.',
        description: '인천 청라 유니크 특허사무소의 디자인등록 안내. 제품 외형과 패키지 디자인을 보호하고 모방 제품을 막는 디자인 출원 절차와 비용을 안내합니다.'
    });
});

router.get('/startup', (req, res) => {
    res.render('startup', {
        title: '인천 스타트업 특허 | 정부지원사업 연계',
        titleEn: 'Startup IP Services',
        descriptionEn: 'A patent attorney who has founded a startup helps startups and aspiring founders with patent strategy, IP portfolios and links to Korean government support programs. Unic Patent Firm, Incheon.',
        description: '직접 창업해 본 변리사가 인천 지역 스타트업과 예비창업자의 특허 전략, IP 포트폴리오, 정부지원사업 연계를 도와드립니다. 인천 청라 유니크 특허사무소.'
    });
});

router.get('/dispute-transfer', (req, res) => {
    res.render('dispute-transfer', {
        title: 'IP 분쟁 대응',
        titleEn: 'IP Dispute Resolution',
        descriptionEn: 'From responding to warning letters to patent infringement litigation, we set out a clear strategy for complex IP disputes.',
        description: '경고장 대응부터 특허 침해 소송까지, 복잡한 IP 분쟁에 대한 명쾌한 전략을 제시합니다.'
    });
});

router.get('/subscribe', (req, res) => {
    res.render('subscribe', { title: '뉴스레터 구독 신청', error: null, form: {} });
});

// 구독 신청 저장 → 관리자 → 뉴스레터 발송 탭에서 확인 후 발송 대상에 추가
router.post('/subscribe', async (req, res) => {
    const form = {
        name: String(req.body.name || '').trim(),
        company_name: String(req.body.company_name || '').trim(),
        email: String(req.body.email || '').trim()
    };
    // 자동 등록 방지용 숨김 칸(사람은 비워 둠)
    if (req.body.website) return res.redirect('/thanks-subscribe');

    const invalid = !form.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) || req.body.privacy_consent !== 'Agreed';
    if (invalid) {
        return res.status(400).render('subscribe', {
            title: '뉴스레터 구독 신청',
            error: '이름, 올바른 이메일, 개인정보 수집 동의를 확인해 주세요.',
            form
        });
    }

    const { error } = await supabase.rpc('newsletter_signup', {
        p_name: form.name, p_company: form.company_name, p_email: form.email
    });
    if (error) {
        console.error('Newsletter signup error:', error.message);
        return res.status(500).render('subscribe', {
            title: '뉴스레터 구독 신청',
            error: '신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
            form
        });
    }

    try {
        await sendSignupNotice({ name: form.name, company: form.company_name, email: form.email });
    } catch (err) {
        console.error('Signup notice mail error:', err.message);
    }
    res.redirect('/thanks-subscribe');
});

router.get('/thanks', (req, res) => {
    res.render('thanks', { title: '감사합니다' });
});

router.get('/thanks-subscribe', (req, res) => {
    res.render('thanks-subscribe', { title: '구독 완료' });
});

// 뉴스레터 수신거부 (메일 하단 링크 / Gmail·네이버 원클릭 수신거부)
// GET은 확인 화면만 보여줌: 메일 보안 프로그램이 링크를 미리 열어도 수신거부되지 않도록
router.get('/unsubscribe', (req, res) => {
    const token = String(req.query.t || '');
    res.render('unsubscribe', {
        title: '뉴스레터 수신거부',
        state: token === TEST_TOKEN ? 'test' : UUID_RE.test(token) ? 'confirm' : 'invalid',
        token,
        email: null
    });
});

router.post('/unsubscribe', async (req, res) => {
    const token = String(req.query.t || req.body.t || '');
    let email = null;
    if (token === TEST_TOKEN) {
        return res.render('unsubscribe', { title: '뉴스레터 수신거부', state: 'test', token, email });
    }
    if (UUID_RE.test(token)) {
        const { data, error } = await supabase.rpc('newsletter_unsubscribe', { p_token: token });
        if (error) console.error('Unsubscribe error:', error);
        email = data || null;
    }
    res.render('unsubscribe', {
        title: '뉴스레터 수신거부',
        state: email ? 'done' : 'invalid',
        token,
        email
    });
});

// 뉴스레터 열람 확인용 1x1 이미지 (메일 본문에 들어감)
const OPEN_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

router.get('/nl/open.gif', async (req, res) => {
    const campaignId = Number(req.query.c);
    const token = String(req.query.t || '');
    if (Number.isInteger(campaignId) && UUID_RE.test(token) && token !== TEST_TOKEN) {
        const { error } = await supabase.rpc('newsletter_track_open', { p_campaign: campaignId, p_token: token });
        if (error) console.error('Newsletter open tracking error:', error.message);
    }
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.type('gif').send(OPEN_PIXEL);
});

// 사이트맵: 고정 페이지 + 지난 뉴스레터 페이지 (발송할 때마다 자동으로 추가됨)
const SITEMAP_PAGES = [
    ['/', 'weekly', '1.0'], ['/incheon', 'monthly', '0.9'], ['/about', 'monthly', '0.8'], ['/column', 'weekly', '0.9'],
    ['/column/strategy', 'weekly', '0.7'], ['/column/patent', 'weekly', '0.7'], ['/column/trademark', 'weekly', '0.7'],
    ['/newsletter', 'weekly', '0.8'], ['/gov-support', 'weekly', '0.9'], ['/contact', 'monthly', '0.7'], ['/location', 'monthly', '0.7'],
    ['/patent', 'monthly', '0.8'], ['/price', 'monthly', '0.8'], ['/trademark', 'monthly', '0.8'], ['/design', 'monthly', '0.8'],
    ['/startup', 'monthly', '0.8'], ['/dispute-transfer', 'monthly', '0.8'], ['/subscribe', 'monthly', '0.5']
];

router.get('/sitemap.xml', async (req, res) => {
    const [{ data, error }, colRes, nlRes] = await Promise.all([
        supabase.rpc('newsletter_archive_list'),
        // updated_at(글을 고친 시각)이 있으면 <lastmod>로 써서 구글이 바뀐 글을 다시 수집하게 함
        // 칸이 아직 없으면(supabase/column_updated_at.sql 실행 전) 처음 쓴 날짜만 사용
        supabase.from('columns').select('url, published_on, updated_at, title_en').eq('summary_ready', true)
            .then(r => r.error ? supabase.from('columns').select('url, published_on, title_en').eq('summary_ready', true) : r),
        // 홈페이지 안에 본문을 저장한 뉴스레터 (HTML 업로드, 스티비에서 옮겨 온 회차)
        supabase.from('newsletters').select('title, link, date').like('link', '/newsletter/%')
    ]);
    if (error) console.error('Sitemap newsletter error:', error.message);
    const sentTitles = new Set((data || []).map(c => newsletterTitleKey(c.subject)));
    const savedNewsletters = (nlRes.data || []).filter(n => /^\/newsletter\/[0-9a-f-]{36}$/i.test(n.link)
        && !sentTitles.has(newsletterTitleKey(n.title)));
    const columns = withColumnLinks((colRes.data || []).map(c => ({ ...c, summary_ready: true })));
    const url = (loc, extra) => `  <url><loc>${res.locals.siteUrl}${loc}</loc>${extra}</url>`;
    const urls = [
        ...SITEMAP_PAGES.map(([loc, freq, priority]) => url(loc, `<changefreq>${freq}</changefreq><priority>${priority}</priority>`)),
        // 영어 페이지 (/en/...) — 영어 검색에 따로 색인되도록
        ...SITEMAP_PAGES.filter(([loc]) => EN_PAGES.has(loc))
            .map(([loc, freq]) => url(enPath(loc), `<changefreq>${freq}</changefreq><priority>0.5</priority>`)),
        ...columns.map(c => {
            const edited = c.updated_at ? kstDate(c.updated_at).replace(/\./g, '-') : '';
            const lastmod = [c.published_on, edited].filter(Boolean).sort().pop();
            const mod = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
            return url(c.href, `${mod}<priority>0.7</priority>`)
                + (c.enInternal ? '\n' + url(enPath(c.href), `${mod}<priority>0.5</priority>`) : '');
        }),
        ...(data || []).map(c => url(`/newsletter/${c.id}`, `<lastmod>${kstDate(c.sent_on).replace(/\./g, '-')}</lastmod><priority>0.6</priority>`)),
        ...savedNewsletters.map(n => url(n.link, `${/^\d{4}\.\d{2}\.\d{2}$/.test(n.date || '') ? `<lastmod>${n.date.replace(/\./g, '-')}</lastmod>` : ''}<priority>0.6</priority>`))
    ];
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`);
});

// 언어 전환
// 예전 언어 전환 주소(/set-lang?lang=en) — 이제 언어는 주소(/en/...)로 나뉘므로, 보던 페이지의 해당 언어 주소로 보냄
router.get('/set-lang', (req, res) => {
    let path = '/';
    try { path = new URL(req.headers.referer).pathname; } catch (e) { /* 이전 페이지 정보 없음 */ }
    path = path.replace(/^\/en(?=\/|$)/, '').replace(/(.)\/$/, '$1') || '/';
    res.clearCookie('lang');
    if (req.query.lang !== 'en') return res.redirect(path);
    res.redirect(hasEnPage(path) ? enPath(path) : '/en');
});

module.exports = router;
