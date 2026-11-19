import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthProvider.jsx';
import DevRoleSwitcher from '@/components/DevRoleSwitcher/DevRoleSwitcher.jsx';
import AppRoutes from '@/routes/AppRoutes.jsx';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
                {/* DEV ONLY: remove with the mock auth on 12/21 */}
                <DevRoleSwitcher />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
