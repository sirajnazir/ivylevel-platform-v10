import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Home, BookOpen, Settings } from 'lucide-react';
import useAuth from '../../hooks/useAuthMock';

const UnifiedHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getNavItems = () => {
    if (user?.role === 'student') {
      return [
        { label: 'Dashboard', path: '/student', icon: Home },
        { label: 'Profile', path: '/student/profile', icon: User },
      ];
    } else if (user?.role === 'coach') {
      return [
        { label: 'Dashboard', path: '/coach', icon: Home },
        { label: 'Knowledge Base', path: '/coach/knowledge-base', icon: BookOpen },
        { label: 'Onboarding', path: '/coach/onboarding', icon: Settings },
      ];
    } else if (user?.role === 'admin') {
      return [
        { label: 'Admin Dashboard', path: '/admin', icon: Home },
        { label: 'Settings', path: '/admin/settings', icon: Settings },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to={`/${user?.role || 'student'}`} className="flex items-center space-x-2">
              <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
                <path d="M16 2L2 9v14l14 7 14-7V9L16 2z" fill="#FE4A22" />
                <path d="M16 12a4 4 0 100 8 4 4 0 000-8z" fill="#641432" />
              </svg>
              <span className="text-xl font-bold text-gray-900">Ivylevel</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center space-x-2 text-gray-600 hover:text-ivy-primary transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{user?.name || user?.email}</span>
              <span className="ml-2 text-xs bg-ivy-primary/10 text-ivy-primary px-2 py-1 rounded-full">
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default UnifiedHeader;