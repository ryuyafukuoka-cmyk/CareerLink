// Real screens, keyed by route path. A screen not listed here shows PlaceholderPage.
// Add one line per screen when it is built. (screenRoutes.js stays plain JS: only data.)

import LoginErrorScreen from '@/screens/auth/LoginErrorScreen.jsx';
import LoginScreen from '@/screens/auth/LoginScreen.jsx';
import CompanyDetailScreen from '@/screens/companies/CompanyDetailScreen.jsx';
import CompanyFormScreen from '@/screens/companies/CompanyFormScreen.jsx';
import CompanyListScreen from '@/screens/companies/CompanyListScreen.jsx';
import HomeScreen from '@/screens/home/HomeScreen.jsx';
import FirstRegistrationScreen from '@/screens/users/FirstRegistrationScreen.jsx';
import { PATHS } from './paths.js';

export const SCREEN_ELEMENTS = {
    [PATHS.login]: <LoginScreen />,
    [PATHS.accessDenied]: <LoginErrorScreen />,
    [PATHS.firstRegistration]: <FirstRegistrationScreen />,
    [PATHS.home]: <HomeScreen />,
    [PATHS.companies]: <CompanyListScreen />,
    [PATHS.companyNew]: <CompanyFormScreen />,
    [PATHS.companyEdit]: <CompanyFormScreen />,
    [PATHS.companyDetail]: <CompanyDetailScreen />,
};
