import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage(getErrorMessage(error));
      return;
    }

    if (token) {
      login(token);
      setStatus('success');
      setTimeout(() => {
        navigate('/datarooms', { replace: true });
      }, 1000);
    } else {
      setStatus('error');
      setErrorMessage('No authentication token received');
    }
  }, [searchParams, login, navigate]);

  function getErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      no_code: 'No authorization code received from Google',
      TOKEN_EXCHANGE_FAILED: 'Failed to authenticate with Google',
      USERINFO_FAILED: 'Failed to get user information',
      server_error: 'An unexpected error occurred',
      access_denied: 'Access was denied',
    };
    return errorMessages[error] || `Authentication failed: ${error}`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="font-display text-xl font-semibold text-white mb-2">
              Authenticating...
            </h2>
            <p className="text-midnight-400">
              Please wait while we complete the sign-in process
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4 animate-fade-in">
              <CheckCircle className="w-8 h-8 text-teal-400" />
            </div>
            <h2 className="font-display text-xl font-semibold text-white mb-2">
              Success!
            </h2>
            <p className="text-midnight-400">
              Redirecting to your datarooms...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-coral-500/20 flex items-center justify-center mx-auto mb-4 animate-fade-in">
              <AlertCircle className="w-8 h-8 text-coral-400" />
            </div>
            <h2 className="font-display text-xl font-semibold text-white mb-2">
              Authentication Failed
            </h2>
            <p className="text-midnight-400 mb-6">
              {errorMessage}
            </p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="btn-primary"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

