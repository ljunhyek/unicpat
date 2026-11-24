// 네이버 블로그 → 유니크 칼럼 가져오기
// 새 글 목록(제목·주소·카테고리·발행일)은 블로그 RSS에서 가져옵니다. 긴 글 본문·썸네일은 Claude Code가 따로 작성합니다.

const BLOG_ID = 'unicpat';
const RSS_URL = `https://rss.blog.naver.com/${BLOG_ID}.xml`;
const KST_OFFSET = 9 * 60 * 60 * 1000;

const blogUrl = no => `https://blog.naver.com/${BLOG_ID}/${no}`;

function decodeEntities(s) {
  return s
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&#x3D;/g, '=')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[​ ]/g, ' ');
}

function tagText(item, tag) {
  const m = item.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`));
  return m ? decodeEntities(m[1]).trim() : '';
}

// 블로그 카테고리 → 홈페이지 칼럼 카테고리 (strategy / patent / trademark)
function mapCategory(blogCategory, title, tags) {
  if (/전략|칼럼/.test(blogCategory)) return 'strategy';
  return /상표|디자인|저작권|브랜드|표장/.test(`${title} ${tags}`) ? 'trademark' : 'patent';
}

// 블로그 RSS의 최근 글 (최대 50개)
async function fetchBlogFeed() {
  const res = await fetch(RSS_URL);
  if (!res.ok) throw new Error(`블로그 RSS를 가져오지 못했습니다 (HTTP ${res.status})`);
  const xml = await res.text();
  return xml.split('<item>').slice(1).map(item => {
    const no = (tagText(item, 'guid').match(/(\d+)\s*$/) || [])[1];
    const title = tagText(item, 'title');
    const tags = tagText(item, 'tag');
    const blogCategory = tagText(item, 'category');
    const pub = new Date(tagText(item, 'pubDate'));
    return {
      no,
      url: no ? blogUrl(no) : null,
      title,
      blogCategory,
      category: mapCategory(blogCategory, title, tags),
      published_on: isNaN(pub) ? null : new Date(pub.getTime() + KST_OFFSET).toISOString().slice(0, 10)
    };
  }).filter(p => p.no && p.title);
}

// 칼럼에 등록된 마지막 블로그 글번호 (네이버 블로그 글번호는 작성 순서대로 커짐)
function latestPostNo(columns) {
  return columns.map(c => (String(c.url || '').match(/blog\.naver\.com\/[^/]+\/(\d+)/) || [])[1])
    .filter(Boolean)
    .reduce((max, no) => (BigInt(no) > max ? BigInt(no) : max), 0n);
}

// 아직 칼럼에 없는 새 블로그 글
async function findNewPosts(supabase) {
  const [feed, { data, error }] = await Promise.all([
    fetchBlogFeed(),
    supabase.from('columns').select('url')
  ]);
  if (error) throw error;
  const latest = latestPostNo(data);
  return feed.filter(p => BigInt(p.no) > latest);
}

// 블로그 글 1개를 칼럼 목록 맨 앞에 추가 (요약은 비워 둠 → '초안 필요' 상태). 이미 있으면 그 id를 돌려줌
async function importPost(supabase, post) {
  const { data: existing } = await supabase.from('columns').select('id').eq('url', post.url).maybeSingle();
  if (existing) return { id: existing.id, created: false };
  const { data: first } = await supabase.from('columns')
    .select('sort_order').order('sort_order', { ascending: true }).limit(1);
  const { data, error } = await supabase.from('columns').insert({
    title: post.title,
    url: post.url,
    image: '',
    category: post.category,
    published_on: post.published_on,
    sort_order: first && first.length ? first[0].sort_order - 1 : 0
  }).select('id').single();
  if (error) throw error;
  return { id: data.id, created: true };
}

module.exports = { fetchBlogFeed, blogUrl, findNewPosts, importPost };
