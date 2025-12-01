import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Database, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout, googleConnected } = useAuth();
  const location = useLocation();

  return (
    <nav className="glass sticky top-0 z-50 border-b border-midnight-600/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/datarooms" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 
                            flex items-center justify-center shadow-lg shadow-teal-500/20
                            group-hover:shadow-teal-500/40 transition-all duration-300">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-white">
              Dataroom
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-6">
            <Link
              to="/datarooms"
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname.startsWith('/datarooms')
                  ? 'text-teal-400'
                  : 'text-midnight-300 hover:text-white'
              }`}
            >
              My Datarooms
            </Link>

            {/* User menu */}
            <div className="flex items-center gap-4 pl-6 border-l border-midnight-600/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-midnight-700 flex items-center justify-center">
                  <User className="w-4 h-4 text-midnight-300" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-white">
                    {user?.name || user?.email}
                  </p>
                  <p className="text-xs text-midnight-400">
                    {googleConnected ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                        Google connected
                      </span>
                    ) : (
                      'Google not connected'
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-2 rounded-lg text-midnight-400 hover:text-coral-400 
                           hover:bg-coral-500/10 transition-all duration-200"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

