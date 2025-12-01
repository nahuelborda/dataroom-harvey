import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import DataroomsPage from './pages/DataroomsPage';
import DataroomDetailPage from './pages/DataroomDetailPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-teal-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen">
      {isAuthenticated && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          path="/datarooms"
          element={
            <ProtectedRoute>
              <DataroomsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/datarooms/:id"
          element={
            <ProtectedRoute>
              <DataroomDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/datarooms" replace />} />
        <Route path="*" element={<Navigate to="/datarooms" replace />} />
      </Routes>
    </div>
  );
}

export default App;

