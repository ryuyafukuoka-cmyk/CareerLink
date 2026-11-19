import { classNames } from '@/utils/classNames.js';
import { getPageItems } from '@/utils/pagination.js';
import './Pagination.css';

// Pager for API lists (10 per page). Pass the values straight from the API response.
// Shows nothing when totalCount is 0.
function Pagination({ page, totalCount, pageSize = 10, onPageChange, disabled = false }) {
    if (!totalCount || totalCount <= 0) return null;

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalCount);
    const go = (target) => {
        if (!disabled && target >= 1 && target <= totalPages && target !== page) {
            onPageChange(target);
        }
    };

    return (
        <nav className="pagination" aria-label="ページ送り">
            <p className="pagination__summary">
                全{totalCount}件中 {from}〜{to}件を表示
            </p>
            {totalPages > 1 && (
                <ul className="pagination__list">
                    <li>
                        <button
                            type="button"
                            className="pagination__button"
                            onClick={() => go(page - 1)}
                            disabled={disabled || page <= 1}
                        >
                            前へ
                        </button>
                    </li>
                    {getPageItems(page, totalPages).map((item) =>
                        typeof item === 'string' ? (
                            <li key={item} className="pagination__ellipsis" aria-hidden="true">
                                …
                            </li>
                        ) : (
                            <li key={item}>
                                <button
                                    type="button"
                                    className={classNames(
                                        'pagination__button',
                                        item === page && 'pagination__button--current',
                                    )}
                                    onClick={() => go(item)}
                                    disabled={disabled}
                                    aria-current={item === page ? 'page' : undefined}
                                    aria-label={`${item}ページ目`}
                                >
                                    {item}
                                </button>
                            </li>
                        ),
                    )}
                    <li>
                        <button
                            type="button"
                            className="pagination__button"
                            onClick={() => go(page + 1)}
                            disabled={disabled || page >= totalPages}
                        >
                            次へ
                        </button>
                    </li>
                </ul>
            )}
        </nav>
    );
}

export default Pagination;
