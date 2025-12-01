import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import { Database, Shield, Zap, Lock } from 'lucide-react';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-teal-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/datarooms" replace />;
  }

  const handleGoogleLogin = () => {
    window.location.href = authApi.getGoogleAuthUrl();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl 
                            bg-gradient-to-br from-teal-400 to-teal-600 mb-6
                            shadow-2xl shadow-teal-500/30">
              <Database className="w-10 h-10 text-white" />
            </div>
            <h1 className="font-display text-4xl font-bold text-white mb-3">
              Dataroom
            </h1>
            <p className="text-midnight-300 text-lg">
              Import and manage your Google Drive files securely
            </p>
          </div>

          {/* Login Card */}
          <div className="card animate-slide-up">
            <h2 className="font-display text-xl font-semibold text-white mb-6 text-center">
              Get Started
            </h2>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 
                         bg-white text-gray-700 font-semibold rounded-xl
                         hover:bg-gray-50 transition-all duration-200
                         shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <p className="text-midnight-400 text-sm text-center mt-6">
              By continuing, you agree to grant read-only access to your Google Drive
            </p>
          </div>

          {/* Features */}
          <div className="mt-10 grid grid-cols-3 gap-4 animate-slide-up stagger-2">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-teal-400" />
              </div>
              <p className="text-sm text-midnight-300">Secure</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-teal-400" />
              </div>
              <p className="text-sm text-midnight-300">Fast</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-teal-400" />
              </div>
              <p className="text-sm text-midnight-300">Private</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-midnight-500 text-sm">
        <p>Google Drive → Dataroom Importer</p>
      </footer>
    </div>
  );
}

