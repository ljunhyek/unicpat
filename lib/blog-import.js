// 네이버 블로그 → 유니크 칼럼 가져오기
// 새 글 목록(제목·주소·카테고리·발행일)은 블로그 RSS에서 가져옵니다. 요약은 관리자가 따로 작성합니다.

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

module.exports = { fetchBlogFeed, blogUrl };
