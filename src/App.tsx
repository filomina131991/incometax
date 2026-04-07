import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { authService } from './api';
import { LogIn, LogOut, User as UserIcon, Settings, Calculator, Users, Home, Menu, X } from 'lucide-react';
import { cn } from './lib/utils';
import AdminDashboard from './components/AdminDashboard';
import TeacherManagement from './components/TeacherManagement';
import TeacherProfile from './components/TeacherProfile';
import TaxCalculator from './components/TaxCalculator';
import FinancialYearManager from './components/FinancialYearManager';
import ErrorBoundary from './components/ErrorBoundary';

function Navbar({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const NavLinks = () => (
    <>
      <Link 
        to="/" 
        onClick={() => setIsMenuOpen(false)}
        className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
      >
        <Home className="h-4 w-4 mr-2" /> Home
      </Link>
      {isAdmin && (
        <>
          <Link 
            to="/admin/fy" 
            onClick={() => setIsMenuOpen(false)}
            className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" /> Financial Years
          </Link>
          <Link 
            to="/admin/teachers" 
            onClick={() => setIsMenuOpen(false)}
            className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
          >
            <Users className="h-4 w-4 mr-2" /> Teachers
          </Link>
        </>
      )}
      <Link 
        to="/calculate" 
        onClick={() => setIsMenuOpen(false)}
        className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
      >
        <Calculator className="h-4 w-4 mr-2" /> Tax Calc
      </Link>
    </>
  );

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="bg-blue-600 p-2 rounded-xl group-hover:scale-110 transition-transform">
                  <Calculator className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm sm:text-lg font-bold text-gray-900 leading-tight whitespace-nowrap">School Tax Manager</span>
                  <span className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-semibold whitespace-nowrap">Income Tax Calculator</span>
                </div>
              </Link>
            </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-sm font-bold text-gray-900">{user.name}</span>
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{isAdmin ? 'Administrator' : 'Teacher'}</span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 hidden sm:flex">
                  <UserIcon className="h-4 w-4 text-gray-500" />
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 hidden sm:flex"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="md:hidden p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                >
                  {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all font-medium text-sm"
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {user && (
        <div className="hidden md:block border-t border-gray-100 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 py-2">
              <NavLinks />
            </div>
          </div>
        </div>
      )}

      {user && isMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white animate-in slide-in-from-top duration-200">
          <div className="px-4 pt-4 pb-6 space-y-4">
            <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-xl">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900">{user.name}</span>
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">{isAdmin ? 'Administrator' : 'Teacher'}</span>
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              <NavLinks />
              <button
                onClick={handleLogout}
                className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors mt-2"
              >
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setIsAdmin(currentUser.role === 'admin' || currentUser.email === 'filomina131991@gmail.com');
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar user={user} isAdmin={isAdmin} />
          <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={user ? <AdminDashboard isAdmin={isAdmin} /> : <Navigate to="/login" />} />
              <Route path="/login" element={!user ? <LoginView /> : <Navigate to="/" />} />
              <Route path="/admin/fy" element={isAdmin ? <FinancialYearManager /> : <Navigate to="/" />} />
              <Route path="/admin/teachers" element={isAdmin ? <TeacherManagement /> : <Navigate to="/" />} />
              <Route path="/teacher/:id" element={user ? <TeacherProfile isAdmin={isAdmin} /> : <Navigate to="/login" />} />
              <Route path="/calculate" element={user ? <TaxCalculator isAdmin={isAdmin} /> : <Navigate to="/login" />} />
              <Route path="/calculate/:teacherId" element={user ? <TaxCalculator isAdmin={isAdmin} /> : <Navigate to="/login" />} />
            </Routes>
          </main>
          <footer className="bg-white border-t border-gray-200 py-6 print:hidden">
            <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} School Income Tax Manager. All rights reserved.
            </div>
          </footer>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

function LoginView() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Default credentials for easier testing during migration
  const handleQuickLogin = async (type: 'admin' | 'teacher') => {
    setLoading(true);
    try {
      const email = type === 'admin' ? 'filomina131991@gmail.com' : 'teacher@example.com';
      await authService.login(email, type === 'admin' ? 'Admin' : 'Teacher');
      window.location.href = '/';
    } catch (err) {
      alert("Login failed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
        <Calculator className="h-16 w-16 text-blue-600 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
        <p className="text-gray-600 mb-8">Please login to access the system.</p>
        
        <div className="space-y-4">
          <button
            onClick={() => handleQuickLogin('admin')}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-all font-medium"
          >
            <UserIcon className="h-5 w-5 font-bold" />
            <span>Login as Administrator</span>
          </button>
          
          <button
            onClick={() => handleQuickLogin('teacher')}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all font-medium"
          >
            <Users className="h-5 w-5" />
            <span>Login as Teacher</span>
          </button>
        </div>
        
        <p className="mt-8 text-xs text-gray-400">
          This system is now connected to MongoDB. Your session will be managed locally.
        </p>
      </div>
    </div>
  );
}

