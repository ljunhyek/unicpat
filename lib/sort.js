// 날짜 문자열(예: 2026.04.14, 2026.4.14, 2026-10-30)을 비교용 숫자 문자열(20260414)로 변환
function dateKey(d) {
    return (String(d || '').match(/\d+/g) || []).slice(0, 3)
        .map((n, i) => n.padStart(i === 0 ? 4 : 2, '0')).join('');
}

// 발행일 최신순 정렬
function sortByDateDesc(items) {
    return items.sort((a, b) => dateKey(b.date).localeCompare(dateKey(a.date)));
}

// 신청기간의 마감일(예: '2026.10.20 ~ 2026.11.20' → '20261120'), 날짜가 없으면 ''
function deadlineKey(period) {
    const dates = String(period || '').match(/\d{4}[.\-]\s*\d{1,2}[.\-]\s*\d{1,2}/g);
    return dates ? dateKey(dates[dates.length - 1]) : '';
}

// 마감 지난 공고는 빼고, 마감 임박순으로 정렬 (마감일 없는 공고는 맨 뒤)
function currentByDeadline(items) {
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
    return items
        .filter(p => { const k = deadlineKey(p.period); return !k || k >= today; })
        .sort((a, b) => (deadlineKey(a.period) || '99999999').localeCompare(deadlineKey(b.period) || '99999999'));
}

module.exports = { sortByDateDesc, currentByDeadline };
