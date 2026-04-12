import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { authService } from './api';
import { LogIn, LogOut, User as UserIcon, Settings, Calculator, Users, Home, Menu, X, BookOpen } from 'lucide-react';
import { cn } from './lib/utils';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import TeacherManagement from './components/TeacherManagement';
import TeacherProfile from './components/TeacherProfile';
import TaxCalculator from './components/TaxCalculator';
import FinancialYearManager from './components/FinancialYearManager';
import MyProfile from './components/MyProfile';
import ErrorBoundary from './components/ErrorBoundary';
import KstaManager from './components/KstaManager';

function Navbar({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isLinkActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const NavLinks = () => (
    <>
      <Link 
        to="/" 
        onClick={() => setIsMenuOpen(false)}
        className={cn(
          "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all duration-300",
          isLinkActive('/') 
            ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105" 
            : "text-gray-600 hover:text-blue-600 hover:bg-white"
        )}
      >
        <Home className="h-4 w-4 mr-2" /> Home
      </Link>
      {isAdmin && (
        <>
          <Link 
            to="/admin/fy" 
            onClick={() => setIsMenuOpen(false)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all duration-300",
              isLinkActive('/admin/fy') 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105" 
                : "text-gray-600 hover:text-blue-600 hover:bg-white"
            )}
          >
            <Settings className="h-4 w-4 mr-2" /> Financial Years
          </Link>
          <Link 
            to="/admin/teachers" 
            onClick={() => setIsMenuOpen(false)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all duration-300",
              isLinkActive('/admin/teachers') 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105" 
                : "text-gray-600 hover:text-blue-600 hover:bg-white"
            )}
          >
            <Users className="h-4 w-4 mr-2" /> Teachers
          </Link>
          <Link 
            to="/admin/ksta" 
            onClick={() => setIsMenuOpen(false)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all duration-300",
              isLinkActive('/admin/ksta') 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105" 
                : "text-gray-600 hover:text-blue-600 hover:bg-white"
            )}
          >
            <BookOpen className="h-4 w-4 mr-2" /> KSTA
          </Link>
        </>
      )}
      <Link 
        to="/calculate" 
        onClick={() => setIsMenuOpen(false)}
        className={cn(
          "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all duration-300",
          isLinkActive('/calculate') 
            ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105" 
            : "text-gray-600 hover:text-blue-600 hover:bg-white"
        )}
      >
        <Calculator className={cn("h-4 w-4 mr-2", isLinkActive('/calculate') ? "animate-pulse" : "")} /> Tax
      </Link>
      <Link 
        to="/my-profile" 
        onClick={() => setIsMenuOpen(false)}
        className={cn(
          "px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-all duration-300",
          isLinkActive('/my-profile') 
            ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105" 
            : "text-gray-600 hover:text-blue-600 hover:bg-white"
        )}
      >
        <UserIcon className="h-4 w-4 mr-2" /> My Profile
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
            <div className="flex space-x-2 py-2">
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
      setIsAdmin(currentUser.role === 'admin');
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
              <Route path="/" element={user ? (isAdmin ? <AdminDashboard isAdmin={isAdmin} /> : <UserDashboard />) : <Navigate to="/login" />} />
              <Route path="/login" element={!user ? <LoginView /> : <Navigate to="/" />} />
              <Route path="/admin/fy" element={isAdmin ? <FinancialYearManager /> : <Navigate to="/" />} />
              <Route path="/admin/teachers" element={isAdmin ? <TeacherManagement /> : <Navigate to="/" />} />
              <Route path="/admin/ksta" element={isAdmin ? <KstaManager /> : <Navigate to="/" />} />
              <Route path="/teacher/:id" element={user ? <TeacherProfile isAdmin={isAdmin} /> : <Navigate to="/login" />} />
              <Route path="/calculate" element={user ? <TaxCalculator isAdmin={isAdmin} /> : <Navigate to="/login" />} />
              <Route path="/calculate/:teacherId" element={user ? <TaxCalculator isAdmin={isAdmin} /> : <Navigate to="/login" />} />
              <Route path="/my-profile" element={user ? <MyProfile /> : <Navigate to="/login" />} />
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.login(username, password);
      window.location.href = '/';
    } catch (err) {
      setError((err as Error).message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-4 rounded-2xl inline-block mb-4 shadow-lg shadow-blue-200">
            <Calculator className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h1>
          <p className="text-gray-500 text-sm">Sign in to access School Tax Manager</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm flex items-center space-x-2">
            <X className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Username
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username or PEN Number"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-md shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Admin: <span className="font-medium text-gray-500">admin / admin</span> &nbsp;|&nbsp; 
            Teachers: <span className="font-medium text-gray-500">PEN Number / PEN Number</span>
          </p>
        </div>
      </div>
    </div>
  );
}

