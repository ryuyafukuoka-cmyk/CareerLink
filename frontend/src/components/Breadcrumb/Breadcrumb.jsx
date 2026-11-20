import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import './Breadcrumb.css';

// Trail of parent pages. The last item is the current page (no link).
// items: [{ label, to? }]
function Breadcrumb({ items }) {
    return (
        <nav className="breadcrumb" aria-label="パンくずリスト">
            <ol className="breadcrumb__list">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    return (
                        <Fragment key={`${item.label}-${index}`}>
                            <li className="breadcrumb__item">
                                {item.to && !isLast ? (
                                    <Link className="breadcrumb__link" to={item.to}>
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span
                                        className="breadcrumb__current"
                                        aria-current={isLast ? 'page' : undefined}
                                    >
                                        {item.label}
                                    </span>
                                )}
                            </li>
                            {!isLast && (
                                <li className="breadcrumb__separator" aria-hidden="true">
                                    <ChevronRight size={14} />
                                </li>
                            )}
                        </Fragment>
                    );
                })}
            </ol>
        </nav>
    );
}

export default Breadcrumb;
