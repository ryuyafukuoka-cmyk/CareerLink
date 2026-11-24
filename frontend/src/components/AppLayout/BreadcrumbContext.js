import { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Lets a screen replace the last breadcrumb label with real data (for example a company name).
// AppLayout provides `setTitle`; screens call usePageTitle(label).
export const BreadcrumbContext = createContext(() => {});

/**
 * Set the label of the current page in the breadcrumb. Pass nothing while the data is loading.
 * @param {string | null | undefined} title
 */
export function usePageTitle(title) {
    const setTitle = useContext(BreadcrumbContext);
    const { pathname } = useLocation();
    useEffect(() => {
        setTitle(title ? { pathname, title } : null);
        return () => setTitle(null);
    }, [setTitle, pathname, title]);
}
