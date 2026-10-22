// 발행일(예: 2026.04.14, 2026.4.14) 최신순 정렬
function sortByDateDesc(items) {
    const key = d => (String(d || '').match(/\d+/g) || []).slice(0, 3)
        .map((n, i) => n.padStart(i === 0 ? 4 : 2, '0')).join('');
    return items.sort((a, b) => key(b.date).localeCompare(key(a.date)));
}

module.exports = { sortByDateDesc };
