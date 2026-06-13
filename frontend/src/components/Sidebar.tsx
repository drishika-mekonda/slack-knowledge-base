import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, UploadCloud, MessageSquare, 
  FileSpreadsheet, LogOut, Shield, User as UserIcon, Sun, Moon 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload', label: 'Ingest & Upload', icon: UploadCloud },
    { to: '/chat', label: 'Knowledge Chat', icon: MessageSquare },
    { to: '/summary', label: 'Summarizer', icon: FileSpreadsheet },
  ];

  return (
    <aside className="w-64 border-r border-subtle bg-sidebar-bg flex flex-col justify-between h-screen sticky top-0 flex-shrink-0 z-30 transition-all duration-300">
      <div>
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-subtle flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider">
              Slack KB
            </h1>
            <p className="text-[10px] text-muted font-semibold tracking-wide">AI-Powered MVP</p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `
                  flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 cursor-pointer
                  ${isActive 
                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-md shadow-blue-500/5' 
                    : 'text-secondary hover:text-primary hover:bg-hover-bg border border-transparent'
                  }
                `}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Session Footer */}
      <div className="p-4 border-t border-subtle bg-hover-bg/30">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-2.5 mb-3 rounded-xl text-xs font-bold text-secondary hover:text-primary border border-subtle hover:bg-hover-bg transition-all duration-300 cursor-pointer"
        >
          <span className="flex items-center space-x-2">
            {theme === 'dark' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light Mode</span>
              </>
            )}
          </span>
          <span className="text-[10px] text-muted font-semibold uppercase">Toggle</span>
        </button>

        {user && (
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-9 h-9 rounded-lg bg-hover-bg flex items-center justify-center text-secondary border border-subtle">
              <UserIcon className="w-4 h-4 text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary truncate">{user.username}</p>
              <p className="text-[10px] text-muted font-semibold truncate capitalize">
                {user.role} • {user.team_name}
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-secondary hover:text-red-500 hover:bg-red-500/5 border border-subtle hover:border-red-500/10 transition-all duration-300 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
