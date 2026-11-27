// Real screens, keyed by route path. A screen not listed here shows PlaceholderPage.
// Add one line per screen when it is built. (screenRoutes.js stays plain JS: only data.)

import DraftCleanupScreen from '@/screens/admin/DraftCleanupScreen.jsx';
import OperationLogScreen from '@/screens/admin/OperationLogScreen.jsx';
import OperationsScreen from '@/screens/admin/OperationsScreen.jsx';
import UserDetailScreen from '@/screens/admin/UserDetailScreen.jsx';
import UserGraduationYearScreen from '@/screens/admin/UserGraduationYearScreen.jsx';
import UserListScreen from '@/screens/admin/UserListScreen.jsx';
import UserRoleScreen from '@/screens/admin/UserRoleScreen.jsx';
import LoginErrorScreen from '@/screens/auth/LoginErrorScreen.jsx';
import LoginScreen from '@/screens/auth/LoginScreen.jsx';
import CompanyDetailScreen from '@/screens/companies/CompanyDetailScreen.jsx';
import CompanyListScreen from '@/screens/companies/CompanyListScreen.jsx';
import ActivityRecordFormScreen from '@/screens/records/ActivityRecordFormScreen.jsx';
import RecordDetailScreen from '@/screens/records/RecordDetailScreen.jsx';
import RecordListScreen from '@/screens/records/RecordListScreen.jsx';
import HomeScreen from '@/screens/home/HomeScreen.jsx';
import ApplicationRoundDetailScreen from '@/screens/rounds/ApplicationRoundDetailScreen.jsx';
import ApplicationRoundListScreen from '@/screens/rounds/ApplicationRoundListScreen.jsx';
import RoundCreateScreen from '@/screens/rounds/RoundCreateScreen.jsx';
import RecordSearchConditionScreen from '@/screens/search/RecordSearchConditionScreen.jsx';
import RecordSearchResultScreen from '@/screens/search/RecordSearchResultScreen.jsx';
import FirstRegistrationScreen from '@/screens/users/FirstRegistrationScreen.jsx';
import { PATHS } from './paths.js';

export const SCREEN_ELEMENTS = {
    [PATHS.login]: <LoginScreen />,
    [PATHS.accessDenied]: <LoginErrorScreen />,
    [PATHS.firstRegistration]: <FirstRegistrationScreen />,
    [PATHS.home]: <HomeScreen />,
    [PATHS.companies]: <CompanyListScreen />,
    [PATHS.companyDetail]: <CompanyDetailScreen />,
    [PATHS.records]: <RecordListScreen />,
    [PATHS.recordNew]: <ActivityRecordFormScreen />,
    [PATHS.recordEdit]: <ActivityRecordFormScreen />,
    [PATHS.recordDetail]: <RecordDetailScreen />,
    [PATHS.search]: <RecordSearchConditionScreen />,
    [PATHS.searchResults]: <RecordSearchResultScreen />,
    [PATHS.searchRecordDetail]: <RecordDetailScreen />,
    [PATHS.adminUsers]: <UserListScreen />,
    [PATHS.adminUserDetail]: <UserDetailScreen />,
    [PATHS.adminUserGraduationYear]: <UserGraduationYearScreen />,
    [PATHS.adminUserRole]: <UserRoleScreen />,
    [PATHS.adminOperations]: <OperationsScreen />,
    [PATHS.adminLogs]: <OperationLogScreen />,
    [PATHS.adminDraftCleanup]: <DraftCleanupScreen />,
    [PATHS.rounds]: <ApplicationRoundListScreen />,
    [PATHS.roundNew]: <RoundCreateScreen />,
    [PATHS.roundDetail]: <ApplicationRoundDetailScreen />,
};
