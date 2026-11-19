/**
 * Page numbers to show in the pager, with gaps marked by 'ellipsis-start' / 'ellipsis-end'.
 * getPageItems(1, 3)  -> [1, 2, 3]
 * getPageItems(10, 20) -> [1, 'ellipsis-start', 8, 9, 10, 11, 12, 'ellipsis-end', 20]
 */
export function getPageItems(page, totalPages, around = 2) {
    if (totalPages <= 1) return [1];
    const items = [1];
    const start = Math.max(2, page - around);
    const end = Math.min(totalPages - 1, page + around);
    if (start > 2) items.push('ellipsis-start');
    for (let p = start; p <= end; p += 1) items.push(p);
    if (end < totalPages - 1) items.push('ellipsis-end');
    items.push(totalPages);
    return items;
}
